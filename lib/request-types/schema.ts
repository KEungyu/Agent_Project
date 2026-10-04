import { z } from "zod";

// ARCHITECTURE §6-1 요청 유형 스키마

const nonEmpty = z.string().min(1);

const slotSchema = z.object({
  key: nonEmpty,
  from_board: nonEmpty.optional(),
  ask: z.object({ en: nonEmpty }).catchall(nonEmpty),
});

const channelSchema = z.object({
  type: z.enum(["email", "phone"]),
  requires: z.array(nonEmpty),
});

export const requestTypeSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_]*$/, "소문자·숫자·밑줄만 쓴다"),
    version: z.number().int().positive(),
    label: z.object({ ko: nonEmpty, en: nonEmpty }).catchall(nonEmpty),
    journey_stage: z.enum(["before_arrival", "airport", "intercity", "during_trip", "departure", "anytime"]),
    execution_level: z.enum(["안내", "준비", "대행"]),
    target: z.enum(["stay", "place"]),
    required_slots: z.array(slotSchema).min(1),
    optional_slots: z.array(nonEmpty).optional(),
    channels: z.array(channelSchema).min(1),
    channel_rule: z.object({
      deadline_slot: nonEmpty,
      // 마감까지 이 시간 "이내"(포함)면 전화를 권한다. 예전 이름 phone_if_hours_left_lt("미만")에서 바꿨다 (2026-10-04 검토)
      phone_within_hours: z.number().positive(),
    }),
    message_guidelines: z.object({
      tone: nonEmpty,
      must_include: z.array(nonEmpty).min(1),
      must_not_include: z.array(nonEmpty),
      max_chars: z.number().int().positive(),
    }),
    reply_hints: z
      .object({
        conditional: z.array(nonEmpty).optional(),
        declined: z.array(nonEmpty).optional(),
        info_requested: z.array(nonEmpty).optional(),
      })
      .optional(),
    follow_ups: z.object({
      on_conditional: nonEmpty,
      on_info_requested: nonEmpty,
      on_declined: z.array(nonEmpty).min(1),
    }),
  })
  .superRefine((type, ctx) => {
    const keys = type.required_slots.map((slot) => slot.key);
    if (!keys.includes(type.channel_rule.deadline_slot)) {
      ctx.addIssue({
        code: "custom",
        path: ["channel_rule", "deadline_slot"],
        message: `required_slots에 없는 키: ${type.channel_rule.deadline_slot}`,
      });
    }
    const duplicated = keys.filter((key, i) => keys.indexOf(key) !== i);
    if (duplicated.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["required_slots"],
        message: `중복된 키: ${[...new Set(duplicated)].join(", ")}`,
      });
    }
  });

export type RequestType = z.infer<typeof requestTypeSchema>;
