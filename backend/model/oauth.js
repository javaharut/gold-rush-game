// models/oauth.js

import {v4 as uuid} from "uuid";
import mongoose from "mongoose";

const {Schema} = mongoose;

/**
 * Schema definitions.
 */
mongoose.model(
  "OAuthClients",
  new Schema({
    _id: {type: String, auto: true},
    userId: {type: String},
    clientId: {type: String},
    clientSecret: {type: String},
    callbackUrl: {type: Date},
    grants: {type: [String], required: true, enum: ["authorization_code", "refresh_token"]}
  }),
  "oauth-authorization-codes"
);
mongoose.model(
  "OAuthAuthorizationCodes",
  new Schema({
    _id: {type: String, auto: true},
    authorizationCode: {type: String},
    expiresAt: {type: Date},
    redirectUri: {type: String},
    scope: {type: String},
    clientId: {type: String},
    userId: {type: String}
  }),
  "oauth-authorization-codes"
);

mongoose.model(
  "OAuthAccessTokens",
  new Schema({
    _id: {type: String},
    accessToken: {type: String},
    accessTokenExpiresAt: {type: Date},
    scope: {type: String}, // not sure if this is needed
    clientId: {type: String},
    userId: {type: String}
  }),
  "oauth-access-tokens"
);

mongoose.model(
  "OAuthRefreshTokens",
  new Schema({
    _id: {type: String},
    refreshToken: {type: String},
    refreshTokenExpiresAt: {type: Date},
    scope: {type: String}, // not sure if this is needed
    clientId: {type: String},
    userId: {type: String}
  }),
  "oauth-refresh-tokens"
);

const OAuthClientsModel = mongoose.model("OAuthClients");
const OAuthAuthorizationCodesModel = mongoose.model("OAuthAuthorizationCodes");
const OAuthAccessTokensModel = mongoose.model("OAuthAccessTokens");
const OAuthRefreshTokensModel = mongoose.model("OAuthRefreshTokens");

/**
 * Get an OAuth2 Client.
 *
 * Called in 1. Authorization and 4. Refresh Token.
 * 'clientSecret' is defined when refreshing the token.
 */
async function getClient(clientId, clientSecret) {
  const client = await OAuthClientsModel.findOne({clientId, ...(clientSecret && {clientSecret})}).lean();
  if (!client) throw new Error("Client not found");

  return {
    id: client.clientId,
    grants: client.grants,
    redirectUris: [client.callbackUrl]
  };
}

/**
 * Save authorization code.
 */
async function saveAuthorizationCode(code, client, user) {
  const authorizationCode = {
    authorizationCode: code.authorizationCode,
    expiresAt: code.expiresAt,
    redirectUri: code.redirectUri,
    scope: code.scope,
    clientId: client.id,
    userId: user._id
  };
  await OAuthAuthorizationCodesModel.create({_id: uuid(), ...authorizationCode});
  return authorizationCode;
}

/**
 * Get authorization code.
 */
async function getAuthorizationCode(authorizationCode) {
  const code = await OAuthAuthorizationCodesModel.findOne({authorizationCode}).lean();
  if (!code) throw new Error("Authorization code not found");

  return {
    code: code.authorizationCode,
    expiresAt: code.expiresAt,
    redirectUri: code.redirectUri,
    scope: code.scope,
    client: {id: code.clientId},
    user: {id: code.userId}
  };
}

/**
 * Revoke authorization code.
 */
async function revokeAuthorizationCode({code}) {
  const res = await OAuthAuthorizationCodesModel.deleteOne({authorizationCode: code});
  return res.deletedCount === 1;
}

/**
 * Revoke a refresh token.
 */
async function revokeToken({refreshToken}) {
  const res = await OAuthAccessTokensModel.deleteOne({refreshToken});
  return res.deletedCount === 1;
}

/**
 * Save token.
 */
async function saveToken(token, client, user) {
  await OAuthAccessTokensModel.create({
    accessToken: token.accessToken,
    accessTokenExpiresAt: token.accessTokenExpiresAt,
    scope: token.scope,
    _id: uuid(),
    clientId: client.id,
    userId: user.id
  });

  if (token.refreshToken) {
    await OAuthRefreshTokensModel.create({
      refreshToken: token.refreshToken,
      refreshTokenExpiresAt: token.refreshTokenExpiresAt,
      scope: token.scope,
      _id: uuid(),
      clientId: client.id,
      userId: user.id
    });
  }

  return {
    accessToken: token.accessToken,
    accessTokenExpiresAt: token.accessTokenExpiresAt,
    refreshToken: token.refreshToken,
    refreshTokenExpiresAt: token.refreshTokenExpiresAt,
    scope: token.scope,
    client: {id: client.id},
    user: {id: user.id},

    // other formats, i.e. for Zapier
    access_token: token.accessToken,
    refresh_token: token.refreshToken
  };
}

/**
 * Get access token.
 */
async function getAccessToken(accessToken) {
  const token = await OAuthAccessTokensModel.findOne({accessToken}).lean();
  if (!token) throw new Error("Access token not found");

  return {
    accessToken: token.accessToken,
    accessTokenExpiresAt: token.accessTokenExpiresAt,
    scope: token.scope,
    client: {id: token.clientId},
    user: {id: token.userId}
  };
}

/**
 * Get refresh token.
 */
async function getRefreshToken(refreshToken) {
  const token = await OAuthRefreshTokensModel.findOne({refreshToken}).lean();
  if (!token) throw new Error("Refresh token not found");

  return {
    refreshToken: token.refreshToken,
    // refreshTokenExpiresAt: token.refreshTokenExpiresAt, // never expires
    scope: token.scope,
    client: {id: token.clientId},
    user: {id: token.userId}
  };
}

export default {
  saveToken,
  saveAuthorizationCode,
  revokeAuthorizationCode,
  revokeToken,
  getAuthorizationCode,
  getAccessToken,
  getClient,
  getRefreshToken
};