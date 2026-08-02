import {
  getProposalMeta,
  localizeProposalText,
  proposalDestination,
  proposalDisplayFields,
  proposalFieldLabel,
  proposalHeadline,
  proposalStatusLabel,
  proposalTechnicalFields
} from "../src/lib/proposals";

describe("AI proposal presentation", () => {
  it("uses the first complete sentence as a concise proposal heading", () => {
    expect(
      proposalHeadline(
        "行程總共 5 天，活動集中在第 2 天。第 3 天仍缺少明確時間與地點。",
        "itinerary_check"
      )
    ).toBe("行程總共 5 天，活動集中在第 2 天。");
  });

  it("keeps nested legacy analysis structured instead of stringifying objects", () => {
    const fields = proposalDisplayFields({
      kind: "itinerary_check",
      model: "qwen3.5:9b",
      source: "local_ollama",
      operations: [],
      warnings: ["第 2 天時間重疊"],
      dayDensity: { day2: "偏高", day3: "適中" }
    });

    expect(fields).toEqual([
      {
        key: "warnings",
        label: "需要留意",
        value: ["第 2 天時間重疊"],
        scalar: false
      },
      {
        key: "dayDensity",
        label: "每日密度",
        value: { day2: "偏高", day3: "適中" },
        scalar: false
      }
    ]);
    expect(proposalFieldLabel("day2")).toBe("第 2 天");
  });

  it("uses honest decision labels and routes each analysis to its workspace", () => {
    expect(proposalStatusLabel("accepted")).toBe("已保留");
    expect(proposalStatusLabel("rejected")).toBe("已略過");
    expect(proposalDestination("trip-1", "receipt_review")).toBe(
      "/trips/trip-1/receipts"
    );
    expect(getProposalMeta("expense_summary").actionLabel).toBe("前往支出");
  });

  it("moves model metadata into a translated technical disclosure", () => {
    expect(
      proposalTechnicalFields({
        source: "local_ollama",
        model: "qwen3.5:9b"
      })
    ).toEqual([
      { label: "執行來源", value: "地端 Ollama" },
      { label: "模型", value: "qwen3.5:9b" }
    ]);
  });

  it("localizes model field names and ISO timestamps inside readable text", () => {
    expect(
      localizeProposalText(
        "活動缺少 startTime、endTime 與 locationName，原值為 2026-09-16T03:00:00.000Z。"
      )
    ).toBe("活動缺少 開始時間、結束時間 與 地點，原值為 2026-09-16 03:00。");
    expect(proposalFieldLabel("eventsWithoutLocation")).toBe("未設定地點");
  });
});
