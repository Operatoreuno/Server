import { Router } from "express";
import { errorHandler } from "@errors/error.handler";
import { forgotPassword, setPassword, updatePassword } from "./password.controller";
import { userAuth } from "@features/auth/utils/auth";
import { forgotPasswordLimiter } from "@core/utils/rate-limits";

const rootRouter:Router = Router();
const mobileRouter:Router = Router();

// Rotte Web
rootRouter.use('/forgot-password', forgotPasswordLimiter, errorHandler(forgotPassword));
rootRouter.use('/set-password', errorHandler(setPassword));
rootRouter.use('/change-password', userAuth, errorHandler(updatePassword));

// Rotte Mobile
mobileRouter.use('/change-password', userAuth, errorHandler(updatePassword));

export default { rootRouter, mobileRouter };