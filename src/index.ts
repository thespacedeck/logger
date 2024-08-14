import "dotenv/config";
import BunyanLogger, { LogLevel, Stream } from "bunyan";
import { createLogger, format, transports } from "winston";
import os from "os";

const logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
const streams: Stream[] = [{ stream: process.stdout, level: logLevel }];
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

export const blogger = BunyanLogger.createLogger({
	name: serviceName,
	serializers: BunyanLogger.stdSerializers,
	streams,
});

// blogger.info("Hello info", { wret: "wert" });
// blogger.error("Hello error", { wret: "wert" });
// blogger.warn("Hello warn", { wret: "wert" });
// blogger.debug("Hello debug", { wret: "wert" });

// *******
// WINSTON
// *******
const levelMap: { [key: string]: number } = {
	error: 50,
	warn: 40,
	info: 30,
	debug: 20,
};
const wlogger = createLogger({
	format: format.combine(
		format.label({ label: serviceName }),
		format.timestamp(),
		format.printf(({ timestamp, level, message, label, ...meta }) => {
			return JSON.stringify({
				name: label,
				hostname: os.hostname(),
				pid: process.pid,
				level: levelMap[level] || level,
				msg: message,
				time: timestamp,
				// streams,
				...meta,
			});
		})
	),
	transports: [new transports.Stream({ stream: process.stdout })],
});

// Wrapper function to enforce StdLogObject type
function logWrapper(level: string, logObject: StdLogObject) {
	wlogger.log(level, logObject);
}

// Extend the logger with custom methods
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
