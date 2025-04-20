import { errorHandler } from "@errors/error.handler";
import { Router } from "express";
import { userAuth } from "@features/auth/utils/auth";
import { updateEmail } from "./settings.controller";

const rootRouter:Router = Router();
const mobileRouter:Router = Router();

rootRouter.use('/update-email', userAuth, errorHandler(updateEmail));
mobileRouter.use('/update-email', userAuth, errorHandler(updateEmail));

export default {rootRouter, mobileRouter};