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

/**
 * Minimal wrappers around chrome APIs.
 */

import { RuntimeMsg, TabMsg } from "./messaging";

export async function tabMessage(tabId: number, msg: TabMsg): Promise<any> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, msg, (response) => resolve(response));
  });
}

export async function runtimeMessage(msg: RuntimeMsg): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(chrome.runtime.id, msg, (response) => {
      resolve(response);
    });
  });
}
