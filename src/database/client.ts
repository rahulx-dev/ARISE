import { Platform } from "react-native";

const platformModule =
  Platform.OS === "web" ? require("./client.web") : require("./client.native");

export const db = platformModule.db;
export const expoDb = platformModule.expoDb;
export const initializeDatabase = platformModule.initializeDatabase;

export * from "./schema";
