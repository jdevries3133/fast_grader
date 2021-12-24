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
