import { renderToString } from "react-dom/server";
import { App } from "./App.js";
export function render(path: string) {
  return renderToString(<App path={path} />);
}
