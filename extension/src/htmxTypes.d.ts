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

declare enum HtmxHttpVerbs {
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
}

interface HtmxEventDetail {
  parameters: Object; //  the parameters that will be submitted in the request
  unfilteredParameters: Object; // the parameters that were found before filtering by hx-select
  headers: { [key: string]: string }; // the request headers
  elt: HTMLElement; // the element that triggered the request
  target: HTMLElement; //  the target of the request
  verb: HtmxHttpVerbs; // the HTTP verb in use
}
