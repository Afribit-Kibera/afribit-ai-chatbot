const { chromium } = require("@playwright/test");
module.exports = {
  ci: {
    collect: {
      url: ["http://127.0.0.1:4173/"],
      numberOfRuns: 3,
      chromePath: process.env.CHROME_PATH || chromium.executablePath(),
      settings: {
        chromeFlags: "--no-sandbox --headless --disable-dev-shm-usage",
        formFactor: "mobile",
        throttlingMethod: "simulate",
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 1,
          disabled: false,
        },
        onlyCategories: [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
        ],
      },
    },
    assert: {
      assertions: {
        "categories:performance": [
          "error",
          { minScore: 0.9, aggregationMethod: "median" },
        ],
        "categories:accessibility": [
          "error",
          { minScore: 0.95, aggregationMethod: "median" },
        ],
        "categories:best-practices": [
          "error",
          { minScore: 0.95, aggregationMethod: "median" },
        ],
        "categories:seo": [
          "error",
          { minScore: 0.95, aggregationMethod: "median" },
        ],
        "largest-contentful-paint": [
          "error",
          { maxNumericValue: 2500, aggregationMethod: "median" },
        ],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "../../internal/frontend/lighthouse",
    },
  },
};
