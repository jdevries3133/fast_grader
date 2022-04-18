/**
 * Copyright (C) 2022 John DeVries
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { getTokenMsg } from "./messaging";
import { BACKEND_BASE_URL } from "./constants";
import { serializeError } from "serialize-error";
import { JsonArray, JsonObject } from "type-fest";
import { inBackgroundScript, fetchToken } from "./background";

export enum SyncStates {
  SYNCED = "S",
  UNSYNCED = "U",
}

export type SubmissionResource = {
  pk: number;
  api_student_profile_id: string;
  api_student_submission_id: string;
  submission?: Array<string>;
  profile_photo_url?: string;
  student_name?: string;
  grade?: number;
  comment?: string;
};

export type GradingSessionDetailResponse = {
  pk: number;
  api_assignment_id: string;
  max_grade: number;
  teacher_template: string;
  average_grade: number;
  sync_state: "U" | "S";
  google_classroom_detail_view_url: string;
  submissions: Array<SubmissionResource>;
};

export async function backendRequest(
  route: string,
  method: string = "GET",
  data?: object,
  headers: Record<string, string> = {}
): Promise<Response> {
  headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...headers,
  };

  if (!headers.Authorization) {
    // try to get a token
    try {
      let tok: string;
      if (inBackgroundScript()) {
        // if this is being called from a background script context, we don't
        // need to send a message to ourselves, we can just get the token
        // directly
        tok = await fetchToken();
      } else {
        // otherwise, send a message to the background script to get the
        // token
        tok = await getTokenMsg();
      }
      if (tok && tok.length) {
        headers = { Authorization: `Token ${tok}`, ...headers };
      }
    } catch (e) {
      logToBackend("could not get auth token", e, {
        associateUser: false,
      });
    }
  }

  const uri = BACKEND_BASE_URL + route;

  if (data && method !== "GET") {
    return fetch(uri, {
      method,
      headers,
      body: JSON.stringify(data),
    });
  } else {
    return fetch(uri, {
      method,
      headers,
    });
  }
}

/**
 * Send log message with optional additional context to the backend, like
 * a json blob or a dump of the DOM content.
 */
export async function logToBackend(
  msg: string,
  error?: Error,
  options?: {
    json?: JsonObject | JsonArray;

    domDump?: boolean;
    // if the issue is with oauth or authentication, we don't want to try to associate
    // the error with a user, since that could cause a recursive loop
    associateUser?: boolean;
    token?: string;
  }
): Promise<void> {
  // supress console logs for testing
  if (global?.process && process?.env?.JEST_WORKER_ID === undefined) {
    console.error("logging error: ", error);
  }

  type Payload = {
    message: string;
    extra_data?: JsonObject | JsonArray;
    dom_dump?: string;
  };
  const payload: Payload = {
    message: msg,
  };
  const headers: Record<string, string> = {};

  if (options?.json) {
    payload.extra_data = options.json;
  }
  if (error) {
    const serialized = serializeError(error);
    payload.extra_data = { ...payload.extra_data, ...serialized };
  }
  if (options?.domDump) {
    payload.dom_dump = `<html>${document.head.outerHTML}${document.body.outerHTML}`;
  }
  if (options?.associateUser === false) {
    // the default behavior of backendRequest is to grab the token and send
    // it along. We can block this by putting a dummy auth header in
    headers.Authorization = "Token prevent_auth_with_null_token";
  }
  try {
    await backendRequest("/ext/log_error/", "POST", payload, headers);
  } finally {
    // just cry; there's nothing more we can do
  }
}
