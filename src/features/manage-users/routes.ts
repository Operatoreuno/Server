import { errorHandler } from "@errors/error.handler";
import { Router } from "express";
import { listUsers, getUserById, updateUser, deleteUser } from "./manage.controller";
import { adminAuth } from "@features/auth/middleware/auth";

/**
 * Router per le funzionalità di gestione utenti.
 * 
 * Percorsi esposti:
 * - GET /list-users: Recupero lista paginata di utenti
 * - GET /get-user/:id: Recupero dettagli di un utente specifico
 * - PUT /update-user/:id: Aggiornamento dati utente
 * - DELETE /delete-user/:id: Eliminazione utente
 * 
 * Caratteristiche di sicurezza:
 * - Tutti i percorsi sono protetti da middleware adminAuth
 * - Gestione centralizzata degli errori con errorHandler
 * - Solo gli amministratori possono accedere a queste funzionalità
 */
const rootRouter:Router = Router();

// Routes Admin Web
rootRouter.use('/list-users', adminAuth, errorHandler(listUsers));
rootRouter.use('/get-user', adminAuth, errorHandler(getUserById));
rootRouter.use('/update-user', adminAuth, errorHandler(updateUser));
rootRouter.use('/delete-user', adminAuth, errorHandler(deleteUser));

export default {rootRouter};