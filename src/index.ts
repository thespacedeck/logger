import "dotenv/config";
import BunyanLogger, { LogLevel, Stream } from "bunyan";
import { createLogger, format, transports } from "winston";
import os from "os";

const serviceName = process.env.CI_PROJECT_NAME || "unknown";
interface StdLogObject {
	message: string;
	meta_data: {
		// compulsory properties
		trace_id: string;
		stack: "NODE" | "GRAPHQL" | "TEMPORAL" | "REDIS";
		// optional meta_data properties
		[key: string]: any;
	};
}

// *******
// BUNYAN
// *******
const logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
const streams: Stream[] = [{ stream: process.stdout, level: logLevel }];

export const blogger = BunyanLogger.createLogger({
	name: serviceName,
	serializers: BunyanLogger.stdSerializers,
	streams,
});

// Usage
// blogger.info("Hello info", { wret: "wert" });
// blogger.error("Hello error", { wret: "wert" });
// blogger.warn("Hello warn", { wret: "wert" });
// blogger.debug("Hello debug", { wret: "wert" });

// example output
// {"name":"sb-logger-project","hostname":"osName...","pid":87591,"level":30,"msg":"Hello info { wret: 'wert' }","time":"2024-08-14T11:19:09.712Z","v":0}
// {"name":"sb-logger-project","hostname":"osName...","pid":87591,"level":50,"msg":"Hello error { wret: 'wert' }","time":"2024-08-14T1:19:09.712Z","v":0}
// {"name":"sb-logger-project","hostname":"osName...","pid":87591,"level":40,"msg":"Hello warn { wret: 'wert' }","time":"2024-08-14T11:19:09.712Z","v":0}
// {"name":"sb-logger-project","hostname":"osName...","pid":87591,"level":20,"msg":"Hello debug { wret: 'wert' }","time":"2024-08-14T11:19:09.712Z","v":0}

// *******
// WINSTON
// *******
const levelMap: { [key: string]: number } = {
	error: 50,
	warn: 40,
	info: 30,
	debug: 20,
};
const consoleFormat = format.combine(
	// colorize the output based on the level
	format.colorize(),
	// format objects from plain text strings to objects in terminal
	format.printf(({ level, message, ...meta }) => {
		const metaString = Object.keys(meta).length
			? JSON.stringify(meta, null, 2)
			: "";
		return `${level}: ${message} ${metaString}`;
	})
);
const transportsArray: transports.StreamTransportInstance[] = [];
if (process.env.NODE_ENV === "development") {
	transportsArray.push(
		new transports.Console({
			format: consoleFormat,
			level: process.env.LOG_LEVEL,
		})
	);
} else {
	transportsArray.push(new transports.Stream({ stream: process.stdout }));
}
const wlogger = createLogger({
	level: process.env.LOG_LEVEL,
	format: format.combine(
		format.label({ label: serviceName }), // infra already emits this so we can replace this with a custom label
		format.timestamp(),
		format.printf(({ timestamp, level, message, label, ...meta }) => {
			return JSON.stringify({
				name: label,
				hostname: os.hostname(),
				pid: process.pid,
				levelNumber: levelMap[level] || level,
				levelName: level,
				msg: message,
				time: timestamp,
				// streams,
				...meta,
			});
		})
	),
	// switch the NODE_ENV variable to determine if the logs are written to console or stdout
	transports: transportsArray,
});

// Wrapper function to enforce StdLogObject type
function logWrapper(level: string, logObject: StdLogObject) {
	wlogger.log(level, logObject);
}

// Extend the logger with custom methods
// switch the LOG_LEVEL variable to see the desired log output level
const logger = {
	info: (logObject: StdLogObject) => logWrapper("info", logObject),
	error: (logObject: StdLogObject) => logWrapper("error", logObject),
	warn: (logObject: StdLogObject) => logWrapper("warn", logObject),
	debug: (logObject: StdLogObject) => logWrapper("debug", logObject),
};

// Usage
logger.info({
	message: "Hello info",
	meta_data: { trace_id: "123", stack: "NODE", wret: "wert" },
});
logger.error({
	message: "Hello error",
	meta_data: { trace_id: "123", stack: "NODE", wret: "wert" },
});
logger.warn({
	message: "Hello warn",
	meta_data: { trace_id: "123", stack: "NODE", wret: "wert" },
});
logger.debug({
	message: "Hello debug",
	meta_data: { trace_id: "123", stack: "NODE", wret: "wert" },
});

// example output
// {"name":"sb-logger-project","hostname":"osName...","pid":87395,"level":30,"msg":"Hello info","time":"2024-08-14T11:16:51.678Z","meta_data":{"trace_id":"123","stack":"NODE","wret":"wert"}}
// {"name":"sb-logger-project","hostname":"osName...","pid":87395,"level":50,"msg":"Hello error","time":"2024-08-14T11:16:51.678Z","meta_data":{"trace_id":"123","stack":"NODE","wret":"wert"}}
// {"name":"sb-logger-project","hostname":"osName...","pid":87395,"level":40,"msg":"Hello warn","time":"2024-08-14T11:16:51.678Z","meta_data":{"trace_id":"123","stack":"NODE","wret":"wert"}}
// {"name":"sb-logger-project","hostname":"osName...","pid":87395,"level":20,"msg":"Hello debug","time":"2024-08-14T11:16:51.679Z","meta_data":{"trace_id":"123","stack":"NODE","wret":"wert"}}
