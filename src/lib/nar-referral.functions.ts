import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Standard NAR Referral Agreement — automatic generation + dual e-signature.
 *
 * Generated the moment a `pending_referral_agreements` row is created
 * (Prompts 9–10). Both named agents must sign before the agreement is
 * executed; on execution the buyer's commission split is locked in via
 * `buyer_accounts.nar_agreement_id`.
 *
 * Compensation scope: the agreement only fixes how the buyer-side commission
 * cascade is divided at closing (25% referring / 75% receiving), paid by the
 * title/escrow company from sale proceeds through each agent's Broker of
 * Record. The Platform pays nothing to any agent or broker.
 */

type Db = { from: (t: string) => any };

export const NAR_REFERRAL_DOCUMENT_TYPE = "nar_referral_agreement";
export const NAR_REFERRAL_VERSION = "v1";
export const REFERRING_SPLIT_PCT = 25;
export const RECEIVING_SPLIT_PCT = 75;

export interface ReferralSignature {
  agent_id: string;
  signed_name: string;
  signed_at: string;
  ip_address: string | null;
  verification_method: string;
}

export interface ReferralParty {
  agentId: string;
  name: string;
  brokerage: string;
  role: "referring" | "receiving";
  signed: boolean;
  signedName: string | null;
  signedAt: string | null;
}

export interface ReferralDocument {
  id: string;
  status: string;
  body: string;
  version: string;
  hash: string | null;
  createdAt: string;
  executedAt: string | null;
  parties: ReferralParty[];
  /** Agent id of the viewer, when they are a required party. */
  viewerAgentId: string | null;
  viewerSigned: boolean;
}

function hashDocument(text: string) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) & 0xffffffff;
  }
  return `djb2_${(hash >>> 0).toString(16)}_${text.length}`;
}

async function admin(): Promise<Db> {
  const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
  return supabaseAdmin as unknown as Db;
}

async function brokerageName(db: Db, brokerId: string | null): Promise<string> {
  if (!brokerId) return "Broker of Record pending";
  const { data } = await db
    .from("brokers")
    .select("brokerage_name")
    .eq("id", brokerId)
    .maybeSingle();
  return data?.brokerage_name ?? "Broker of Record pending";
}

export function buildAgreementBody(params: {
  referringName: string;
  referringBrokerage: string;
  receivingName: string;
  receivingBrokerage: string;
  buyerIdentifier: string;
  market: string;
  propertyLabel: string | null;
}) {
  const {
    referringName,
    referringBrokerage,
    receivingName,
    receivingBrokerage,
    buyerIdentifier,
    market,
    propertyLabel,
  } = params;

  return `STANDARD NAR REFERRAL AGREEMENT (divieight ${NAR_REFERRAL_VERSION})

1. PARTIES
Referring Agent: ${referringName} — ${referringBrokerage}
Receiving Agent: ${receivingName} — ${receivingBrokerage}

2. REFERRED CLIENT
Buyer Account: ${buyerIdentifier}
Target market: ${market || "not specified"}
Property: ${propertyLabel ?? "not yet identified at the time of referral"}

3. REFERRAL
The Referring Agent has referred the Buyer Account identified above to the
Receiving Agent, who is tethered to that buyer as their Resident Agent on the
divieight platform for fractional (1/8th share) co-ownership transactions.

4. COMPENSATION AND SPLIT
Upon a successful closing in which the Buyer Account acquires one or more
shares, the buyer-side real estate commission is paid at closing by the
title or escrow company from sale proceeds to the Brokers of Record for the
parties. That buyer-side commission shall be divided:

    Referring Agent's Broker of Record ....... ${REFERRING_SPLIT_PCT}%
    Receiving Agent's Broker of Record ....... ${RECEIVING_SPLIT_PCT}%

All amounts are payable only through each agent's Broker of Record. divieight
is a technology platform and is not a party to the commission; divieight pays
no bounty, referral fee, marketing fee, or other compensation to either agent
or their brokerage under this Agreement.

5. TERM AND CONDITIONS
This Agreement applies to the referred Buyer Account named above and to
transactions closed by that Buyer Account while the tethering relationship
remains in effect. No compensation is earned unless and until a transaction
closes. Each party affirms they hold an active real estate license and an
active relationship with their named Broker of Record.

6. NO ADVICE
Neither party provides legal, tax, accounting, or investment advice under this
Agreement. Each party is responsible for their own compliance with NAR policy,
state license law, and applicable settlement rules.

7. EXECUTION
This Agreement is executed electronically and is binding only once BOTH named
parties have signed. Each signature is recorded with the signer's typed name,
timestamp, IP address, and secondary verification method.`;
}

async function auditRow(db: Db, row: Record<string, unknown>) {
  await db.from("audit_log").insert(row);
}

/**
 * Generates the agreement document for a pending referral row. Idempotent:
 * returns the existing document id when one was already generated.
 */
export async function generateReferralAgreement(
  db: Db,
  pendingId: string,
  actorId: string,
): Promise<string | null> {
  const { data: pending } = await db
    .from("pending_referral_agreements")
    .select("id, buyer_account_id, non_resident_agent_id, resident_agent_id, status, document_id")
    .eq("id", pendingId)
    .maybeSingle();
  if (!pending) return null;
  if (pending.document_id) return pending.document_id as string;

  const [{ data: referring }, { data: receiving }, { data: buyer }] = await Promise.all([
    db
      .from("agents")
      .select("id, auth_user_id, full_name, broker_id")
      .eq("id", pending.non_resident_agent_id)
      .maybeSingle(),
    db
      .from("agents")
      .select("id, auth_user_id, full_name, broker_id")
      .eq("id", pending.resident_agent_id)
      .maybeSingle(),
    db
      .from("buyer_accounts")
      .select("id, email, primary_target_market")
      .eq("id", pending.buyer_account_id)
      .maybeSingle(),
  ]);
  if (!referring || !receiving) return null;

  const [referringBrokerage, receivingBrokerage] = await Promise.all([
    brokerageName(db, referring.broker_id ?? null),
    brokerageName(db, receiving.broker_id ?? null),
  ]);

  const body = buildAgreementBody({
    referringName: referring.full_name ?? "Referring Agent",
    referringBrokerage,
    receivingName: receiving.full_name ?? "Receiving Agent",
    receivingBrokerage,
    buyerIdentifier: buyer?.email ?? pending.buyer_account_id,
    market: buyer?.primary_target_market ?? "",
    propertyLabel: null,
  });

  const { data: doc, error } = await db
    .from("signed_documents")
    .insert({
      document_type: NAR_REFERRAL_DOCUMENT_TYPE,
      document_version: NAR_REFERRAL_VERSION,
      signed_name: "",
      buyer_account_id: pending.buyer_account_id,
      document_body: body,
      document_hash: hashDocument(`${NAR_REFERRAL_VERSION}::${body}`),
      status: "awaiting_signatures",
      requires_signatures_from: [referring.id, receiving.id],
      signed_by: [],
      referral_agreement_id: pending.id,
    })
    .select("id")
    .maybeSingle();
  if (error || !doc) {
    console.error("[nar-referral] document insert failed", error);
    return null;
  }

  await db
    .from("pending_referral_agreements")
    .update({ status: "awaiting_signatures", document_id: doc.id })
    .eq("id", pending.id);

  const message = "Signature required: your Standard NAR Referral Agreement is ready to sign.";
  for (const a of [referring, receiving]) {
    if (a.auth_user_id) {
      await db.from("notifications").insert({
        seller_id: a.auth_user_id,
        message: `${message} /agent/documents/${doc.id}`,
        type: "nar_referral_agreement",
      });
    }
  }

  await auditRow(db, {
    actor_id: actorId,
    actor_type: "agent",
    action_type: "agent.nar_referral_generated",
    entity_type: "referral_agreement",
    entity_id: doc.id,
    metadata: {
      pending_referral_agreement_id: pending.id,
      buyer_account_id: pending.buyer_account_id,
      referring_agent_id: referring.id,
      receiving_agent_id: receiving.id,
      split: `${REFERRING_SPLIT_PCT}/${RECEIVING_SPLIT_PCT}`,
    },
  });

  return doc.id as string;
}

async function agentFor(db: Db, userId: string) {
  const { data } = await db
    .from("agents")
    .select("id, full_name, broker_id")
    .eq("auth_user_id", userId)
    .maybeSingle();
  return data;
}

async function toReferralDocument(
  db: Db,
  doc: any,
  viewerAgentId: string | null,
): Promise<ReferralDocument> {
  const { data: pending } = await db
    .from("pending_referral_agreements")
    .select("non_resident_agent_id, resident_agent_id")
    .eq("id", doc.referral_agreement_id)
    .maybeSingle();

  const ids: string[] = (doc.requires_signatures_from ?? []) as string[];
  const signatures: ReferralSignature[] = (doc.signed_by ?? []) as ReferralSignature[];

  const { data: agents } = await db
    .from("agents")
    .select("id, full_name, broker_id")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const parties: ReferralParty[] = [];
  for (const id of ids) {
    const a = (agents ?? []).find((x: any) => x.id === id);
    const sig = signatures.find((s) => s.agent_id === id) ?? null;
    parties.push({
      agentId: id,
      name: a?.full_name ?? "Agent",
      brokerage: await brokerageName(db, a?.broker_id ?? null),
      role: id === pending?.non_resident_agent_id ? "referring" : "receiving",
      signed: Boolean(sig),
      signedName: sig?.signed_name ?? null,
      signedAt: sig?.signed_at ?? null,
    });
  }

  return {
    id: doc.id,
    status: doc.status,
    body: doc.document_body ?? "",
    version: doc.document_version,
    hash: doc.document_hash ?? null,
    createdAt: doc.created_at,
    executedAt: doc.executed_at ?? null,
    parties,
    viewerAgentId,
    viewerSigned: viewerAgentId
      ? signatures.some((s) => s.agent_id === viewerAgentId)
      : false,
  };
}

export const listAgentReferralDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReferralDocument[]> => {
    const db = await admin();
    const agent = await agentFor(db, context.userId);
    if (!agent) return [];
    const { data: rows } = await db
      .from("signed_documents")
      .select("*")
      .eq("document_type", NAR_REFERRAL_DOCUMENT_TYPE)
      .contains("requires_signatures_from", [agent.id])
      .order("created_at", { ascending: false });
    return Promise.all(((rows ?? []) as any[]).map((r) => toReferralDocument(db, r, agent.id)));
  });

export const getAgentReferralDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { documentId: string }) => input)
  .handler(async ({ data, context }): Promise<ReferralDocument | null> => {
    const db = await admin();
    const agent = await agentFor(db, context.userId);
    const { data: doc } = await db
      .from("signed_documents")
      .select("*")
      .eq("id", data.documentId)
      .eq("document_type", NAR_REFERRAL_DOCUMENT_TYPE)
      .maybeSingle();
    if (!doc) return null;
    const ids: string[] = (doc.requires_signatures_from ?? []) as string[];
    if (!agent || !ids.includes(agent.id)) return null;
    return toReferralDocument(db, doc, agent.id);
  });

export const signReferralAgreement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      documentId: string;
      typedName: string;
      verificationMethod: string;
      ipAddress?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<{ error?: string; document?: ReferralDocument }> => {
    const db = await admin();
    const agent = await agentFor(db, context.userId);
    if (!agent) return { error: "No agent profile found for this account." };

    const { data: doc } = await db
      .from("signed_documents")
      .select("*")
      .eq("id", data.documentId)
      .eq("document_type", NAR_REFERRAL_DOCUMENT_TYPE)
      .maybeSingle();
    if (!doc) return { error: "Agreement not found." };

    const ids: string[] = (doc.requires_signatures_from ?? []) as string[];
    if (!ids.includes(agent.id)) return { error: "You are not a required party to this agreement." };

    const typed = data.typedName.trim();
    if (typed.length < 2) return { error: "Type your full legal name to sign." };
    if (typed.toLowerCase() !== (agent.full_name ?? "").trim().toLowerCase()) {
      return { error: "The typed name must match your name on file." };
    }

    const signatures: ReferralSignature[] = (doc.signed_by ?? []) as ReferralSignature[];
    if (signatures.some((s) => s.agent_id === agent.id)) {
      return { document: await toReferralDocument(db, doc, agent.id) };
    }

    const now = new Date().toISOString();
    const next = [
      ...signatures,
      {
        agent_id: agent.id,
        signed_name: typed,
        signed_at: now,
        ip_address: data.ipAddress ?? null,
        verification_method: data.verificationMethod,
      },
    ];
    const fullyExecuted = ids.every((id) => next.some((s) => s.agent_id === id));

    const { data: updated } = await db
      .from("signed_documents")
      .update({
        signed_by: next,
        signed_name: typed,
        ip_address: data.ipAddress ?? null,
        status: fullyExecuted ? "executed" : "awaiting_signatures",
        executed_at: fullyExecuted ? now : null,
      })
      .eq("id", doc.id)
      .select("*")
      .maybeSingle();

    await auditRow(db, {
      actor_id: context.userId,
      actor_type: "agent",
      action_type: "agent.nar_referral_signed",
      entity_type: "referral_agreement",
      entity_id: doc.id,
      metadata: {
        agent_id: agent.id,
        signed_name: typed,
        verification_method: data.verificationMethod,
        ip_address: data.ipAddress ?? null,
        fully_executed: fullyExecuted,
      },
    });

    if (fullyExecuted) {
      await db
        .from("pending_referral_agreements")
        .update({ status: "executed", executed_at: now })
        .eq("id", doc.referral_agreement_id);
      if (doc.buyer_account_id) {
        await db
          .from("buyer_accounts")
          .update({ nar_agreement_id: doc.id })
          .eq("id", doc.buyer_account_id);
      }

      const { data: parties } = await db
        .from("agents")
        .select("id, auth_user_id")
        .in("id", ids);
      for (const p of parties ?? []) {
        if (p.auth_user_id) {
          await db.from("notifications").insert({
            seller_id: p.auth_user_id,
            message:
              "Your Standard NAR Referral Agreement is fully executed — the 25%/75% buyer-side commission split is locked in.",
            type: "nar_referral_agreement",
          });
        }
      }

      await auditRow(db, {
        actor_id: context.userId,
        actor_type: "agent",
        action_type: "agent.nar_referral_executed",
        entity_type: "referral_agreement",
        entity_id: doc.id,
        metadata: {
          buyer_account_id: doc.buyer_account_id,
          split: `${REFERRING_SPLIT_PCT}/${RECEIVING_SPLIT_PCT}`,
          executed_at: now,
        },
      });
    }

    return { document: await toReferralDocument(db, updated ?? doc, agent.id) };
  });
