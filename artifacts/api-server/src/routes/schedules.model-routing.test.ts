import { describe, it, expect } from "vitest";
import { pickModel } from "./schedules";

describe("pickModel", () => {
  it("routes empty input to gpt-5.4-mini", () => {
    expect(pickModel([])).toBe("gpt-5.4-mini");
    expect(pickModel([""])).toBe("gpt-5.4-mini");
  });

  it("routes single short answers without punctuation to gpt-5.4-mini", () => {
    expect(pickModel(["7:30", "23:00", "evening"])).toBe("gpt-5.4-mini");
  });

  it("routes a one-sentence note to gpt-5.4-mini", () => {
    expect(pickModel(["I prefer studying in the evening."])).toBe("gpt-5.4-mini");
  });

  it("routes a multi-sentence note to gpt-5.4", () => {
    expect(
      pickModel(["7:30", "I prefer studying in the evening. Please keep Fridays light."]),
    ).toBe("gpt-5.4");
  });

  it("treats newlines as sentence boundaries", () => {
    expect(pickModel(["Study in the evening\nKeep weekends free"])).toBe("gpt-5.4");
  });

  it("does not merge separate short answers into multiple sentences", () => {
    // Each answer is counted on its own, so several one-liners stay on mini.
    expect(pickModel(["7:30", "23:00", "90 minute sessions"])).toBe("gpt-5.4-mini");
  });

  it("routes multi-sentence revision instructions to gpt-5.4", () => {
    expect(
      pickModel(["Move my homework to mornings. Also add a gym block on Tuesday!"]),
    ).toBe("gpt-5.4");
  });
});
