import { useState } from "react";
import { Button } from "@/components/ui/button";
import Panel from "@/components/Panel";
import TabBar from "@/components/TabBar";
import { Copy, Cable } from "lucide-react";

const APP_URL = "https://venus-orbit-guard.base44.app";

const MCP_PROXY = `VENUS_SHIELD_URL=${APP_URL} \\
VENUS_SHIELD_API_KEY=vs_live_... \\
VENUS_AGENT_ID=<agent_id> \\
VENUS_TARGET_SYSTEM=<system> \\
node venus-shield-mcp-proxy.mjs -- <your normal MCP server command>`;

const MCP_CONFIG = `{ "mcpServers": { "filesystem": {
  "command": "node",
  "args": ["/path/venus-shield-mcp-proxy.mjs", "--", "npx", "-y", "@modelcontextprotocol/server-filesystem", "/data"],
  "env": {
    "VENUS_SHIELD_URL": "${APP_URL}",
    "VENUS_SHIELD_API_KEY": "vs_live_...",
    "VENUS_AGENT_ID": "ops-agent",
    "VENUS_TARGET_SYSTEM": "filesystem"
  } } } }`;

const JS_SDK = `import { VenusShield } from './venus-shield.mjs';

const shield = new VenusShield({
  url: '${APP_URL}',
  apiKey: process.env.VENUS_SHIELD_API_KEY,
  agentId: 'finance-agent',
});

const issueRefund = shield.guard(realIssueRefund, {
  actionType: 'issue_refund',
  targetSystem: 'billing',
  amount: a => a.amount,
});`;

const PY_SDK = `from venus_shield import VenusShield

shield = VenusShield(
    url='${APP_URL}',
    api_key=os.environ['VENUS_SHIELD_API_KEY'],
    agent_id='finance-agent',
)

@shield.guard(action_type='issue_refund', target_system='billing',
              amount=lambda kw: kw.get('amount', 0))
def issue_refund(customer_id, amount):
    ...`;

const TABS = [
  { value: "mcp", label: "MCP Proxy" },
  { value: "js", label: "JavaScript SDK" },
  { value: "py", label: "Python SDK" },
];

function Snippet({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) { /* clipboard unavailable */ }
  };
  return (
    <div className="relative">
      <Button size="sm" variant="outline" className="absolute right-2 top-2" onClick={copy}>
        <Copy className="mr-1 h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
      </Button>
      <pre className="vs-scroll overflow-x-auto rounded-md border border-border bg-muted/30 p-3 pr-24 font-mono text-[11px] leading-relaxed text-muted-foreground">{code}</pre>
    </div>
  );
}

/** How to point an agent runtime at the enforcement endpoint. */
export default function ConnectAgentCard() {
  const [tab, setTab] = useState("mcp");

  return (
    <Panel
      title="Connect an Agent"
      description="Wrap an agent runtime so it asks for a verdict before every action. The key comes from Runtime Access on the agent's passport."
      icon={Cable}
      contentClassName="p-0"
    >
      <TabBar tabs={TABS} value={tab} onChange={setTab} className="px-5" />
      <div className="space-y-3 p-5">
        {tab === "mcp" && (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              A zero-dependency proxy that wraps any stdio MCP server and intercepts <span className="font-mono">tools/call</span>. Works with Claude Desktop, Cursor and any MCP client.
            </p>
            <Snippet code={MCP_PROXY} />
            <div className="vs-eyebrow pt-1">Claude Desktop configuration</div>
            <Snippet code={MCP_CONFIG} />
          </>
        )}
        {tab === "js" && (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Guard individual functions in a Node agent: <span className="font-mono">allow</span> runs them, <span className="font-mono">block</span> throws, and <span className="font-mono">approval_required</span> waits for a human decision in Action Review.
            </p>
            <Snippet code={JS_SDK} />
          </>
        )}
        {tab === "py" && (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              The Python SDK has no third-party dependencies. Decorate a function and every call passes through the same governance engine.
            </p>
            <Snippet code={PY_SDK} />
          </>
        )}
        <p className="text-[11px] leading-relaxed text-muted-foreground/80">
          Keys are issued per agent under Runtime Access. A revoked key, or a passport that is not active, is refused before anything is evaluated.
        </p>
      </div>
    </Panel>
  );
}