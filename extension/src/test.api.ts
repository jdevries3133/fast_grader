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

import { fetchMock } from "./setupTestEnv";
import { logToBackend, backendRequest } from "./api";

// setup serializeError mock
import { ErrorObject, serializeError as _se } from "serialize-error";
jest.mock("serialize-error");
const _se_tmp = <any>_se;
const serializeError = <jest.MockedFunction<typeof _se>>_se_tmp;

// setup getToken mock
import { getTokenMsg as _gt } from "./messaging";
jest.mock("./messaging");
const _gt_tmp = <any>_gt;
const getTokenMsg = <jest.MockedFunction<typeof _gt>>_gt_tmp;

// setup background modk
import { inBackgroundScript as _ibs, fetchToken as _ft } from "./background";
jest.mock("./background");
const _ibst = <any>_ibs;
const inBackgroundScript = <jest.MockedFunction<typeof _ibs>>_ibst;

inBackgroundScript.mockImplementation(() => false);

describe("logToBackend", () => {
  beforeAll(() => {
    fetchMock.mockClear();
    getTokenMsg.mockClear();
  });
  afterEach(() => {
    fetchMock.mockClear();
    getTokenMsg.mockClear();
  });

  it("causes a network request to /ext/log_error", async () => {
    await logToBackend("foo");
    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/ext/log_error/", {
      body: '{"message":"foo"}',
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("responds to dumDom=true", async () => {
    await logToBackend("foo", null, { domDump: true });
    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/ext/log_error/", {
      body: '{"message":"foo","dom_dump":"<html><head></head><body></body>"}',
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("responds to dumpDom=false", async () => {
    await logToBackend("foo", null, { domDump: false });
    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/ext/log_error/", {
      body: '{"message":"foo"}',
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("sends extra data when provided", async () => {
    await logToBackend("foo", null, {
      json: { data: "data" },
    });
    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/ext/log_error/", {
      body: '{"message":"foo","extra_data":{"data":"data"}}',
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });
  it("can take and serialize an Error object in the json argument", async () => {
    serializeError.mockImplementation(() => {
      return <ErrorObject>{ name: "foo" };
    });
    const err = new Error("foo");
    await logToBackend("error!", err);
    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/ext/log_error/", {
      body: '{"message":"error!","extra_data":{"name":"foo"}}',
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });
  it("sends the user's token by default", async () => {
    getTokenMsg.mockImplementation(async () => "SENTINEL");
    await logToBackend("foo");
    expect(getTokenMsg).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/ext/log_error/", {
      body: '{"message":"foo"}',
      headers: {
        Accept: "application/json",
        Authorization: "Token SENTINEL",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });
  it("does not try to get the token is associateUser is false", async () => {
    await logToBackend("foo", null, { associateUser: false });
    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/ext/log_error/", {
      body: '{"message":"foo"}',
      headers: {
        Accept: "application/json",
        Authorization: "Token prevent_auth_with_null_token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    expect(getTokenMsg).toHaveBeenCalledTimes(0);
  });
});

describe("backendRequest", () => {
  enum fetchOpts {
    "SUCCEED",
    "FAIL",
    "THROW",
  }
  function makeFetch(action: fetchOpts, errMsg?: string) {
    switch (action) {
      case fetchOpts.SUCCEED:
        fetchMock.mockImplementation(() => ({ status: 200 }));
        break;
      case fetchOpts.FAIL:
        fetchMock.mockImplementation(() => ({ status: 400 }));
        break;
      case fetchOpts.THROW:
        fetchMock.mockImplementation(() => {
          throw new Error(errMsg || "foo");
        });
    }
  }
  beforeAll(() => {
    getTokenMsg.mockImplementation(async () => "defaultToken");
    fetchMock.mockClear();
  });
  afterEach(() => fetchMock.mockClear());

  it("sends request to backend with fetch api", async () => {
    makeFetch(fetchOpts.SUCCEED);
    const res = await backendRequest("", "GET");
    expect(res.status).toBe(200);
  });
  it("allows the use of any http method", async () => {
    makeFetch(fetchOpts.SUCCEED);
    ["GET", "POST", "PUT", "DELETE", "PATCH"].forEach(async (verb) => {
      await backendRequest("", verb);
      expect(fetch).toHaveBeenCalledWith("http://localhost:8000", {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: "Token defaultToken",
        },
        method: verb,
      });
    });
  });

  it("does not swallow thrown errors", async () => {
    makeFetch(fetchOpts.THROW);
    try {
      await backendRequest("");

      throw new Error("backendRequest swallowed error thrown from fetch");
    } catch (e) {
      expect(e.message).toBe("foo");
    }
  });

  it("does not override auth header if it is provided as an argument", async () => {
    makeFetch(fetchOpts.SUCCEED);
    await backendRequest("", "GET", null, {
      Authorization: "custom",
    });
    expect(fetch).toHaveBeenCalledWith("http://localhost:8000", {
      headers: {
        Accept: "application/json",
        Authorization: "custom",
        "Content-Type": "application/json",
      },
      method: "GET",
    });
  });

  it("gets the auth token and includes it as a request header", async () => {
    makeFetch(fetchOpts.SUCCEED);
    getTokenMsg.mockImplementation(async () => "footoken");

    await backendRequest("");

    expect(fetch).toHaveBeenCalledWith("http://localhost:8000", {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Token footoken",
      },
      method: "GET",
    });
  });
  it("still sends a request if the token is absent", async () => {
    makeFetch(fetchOpts.SUCCEED);
    getTokenMsg.mockImplementation(async () => null);

    await backendRequest("");

    expect(fetch).toHaveBeenCalledWith("http://localhost:8000", {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "GET",
    });
  });

  it("handles exceptions from getToken", async () => {
    makeFetch(fetchOpts.SUCCEED);
    getTokenMsg.mockImplementation(async () => {
      throw new Error("foo");
    });

    try {
      await backendRequest("");
      expect(fetch).toHaveBeenCalledWith("http://localhost:8000", {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "GET",
      });
    } catch (e) {
      throw new Error(
        `backendRequest failed to catch exception from getToken: ${e}`
      );
    }
  });
});
