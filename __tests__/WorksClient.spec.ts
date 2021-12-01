import { WorksClient } from "../src/WorksClient";

describe("WorksClient", () => {
  describe("punchingURLForPc", () => {
    it("success", () => {
      const client = new WorksClient(
        "proxy-domain.example.com",
        "domain.example.com"
      );
      expect(client.punchingURLForPc).toEqual(
        `https://domain.example.com/self-workflow/cws/srwtimerec?@DIRECT=true`
      );
    });
  });
});
