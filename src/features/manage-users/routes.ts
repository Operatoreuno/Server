import { errorHandler } from "@errors/error.handler";
import { Router } from "express";
import { listUsers, getUserById, updateUser, deleteUser } from "./manage.controller";
import { adminAuth } from "@features/auth/utils/auth";

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

// Recupero lista paginata di utenti
// Accessibile solo agli amministratori
rootRouter.use('/list-users', adminAuth, errorHandler(listUsers));

// Recupero dettagli di un utente specifico tramite ID
// Accessibile solo agli amministratori
rootRouter.use('/get-user', adminAuth, errorHandler(getUserById));

// Aggiornamento dati di un utente esistente
// Accessibile solo agli amministratori
rootRouter.use('/update-user', adminAuth, errorHandler(updateUser));

// Eliminazione di un utente dal sistema
// Accessibile solo agli amministratori
rootRouter.use('/delete-user', adminAuth, errorHandler(deleteUser));

export default {rootRouter};