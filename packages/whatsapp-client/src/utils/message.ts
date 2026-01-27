import type { WAMessage } from '@whiskeysockets/baileys';
import { extractPhoneFromJid } from './jid.js';
import { logger } from '../logger.js';

/**
 * Get sender name from message
 */
export function getSenderName(msg: WAMessage): string {
  return (
    msg.pushName ||
    msg.verifiedBizName ||
    extractPhoneFromJid(msg.key.participant || msg.key.remoteJid!)
  );
}

/**
 * Check if bot is mentioned in group message
 * Supports both phone JID (@s.whatsapp.net) and LID (@lid) formats
 */
export function isBotMentioned(msg: WAMessage, botJid: string, botLid?: string): boolean {
  // Check contextInfo from different message types that support mentions
  const contextInfo =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.documentMessage?.contextInfo;

  const mentionedJids = contextInfo?.mentionedJid || [];
  const matchesJid = mentionedJids.includes(botJid);
  const matchesLid = botLid ? mentionedJids.includes(botLid) : false;

  logger.debug({ botJid, botLid, mentionedJids, matchesJid, matchesLid }, 'Checking bot mention');
  return matchesJid || matchesLid;
}

/**
 * Check if message is a reply to bot
 */
export function isReplyToBotMessage(msg: WAMessage, botJid: string): boolean {
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  return quotedParticipant === botJid;
}

/**
 * Determine if bot should respond in group chat
 * Checks for both @mention (JID or LID) and replies to bot messages
 */
export function shouldRespondInGroup(msg: WAMessage, botJid: string, botLid?: string): boolean {
  return isBotMentioned(msg, botJid, botLid) || isReplyToBotMessage(msg, botJid);
}
