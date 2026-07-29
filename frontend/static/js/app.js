/**
 * KKR Enterprise Agent Platform
 * Dynamic Multi-Agent UI Engine & Reactive EventSource Stream Parser
 */

class MultiAgentDynamicUiEngine {
    constructor() {
        this.activeEventSource = null;
    }

    setPreset(type) {
        const promptInput = document.getElementById("promptInput");
        const companySelect = document.getElementById("portfolioCompany");

        if (type === "claims") {
            companySelect.value = "KKR-HEALTHCARE-01";
            promptInput.value = "Healthcare Portfolio Asset – Claims Processing & Authorization Bottleneck. Process claim #CL-88912 for $18,450.00 via AS400 terminal and Epic EHR FHIR endpoints.";
        } else if (type === "procurement") {
            companySelect.value = "KKR-FINANCE-02";
            promptInput.value = "Accounts Payable Invoice Matching v3. Reconcile SAP S/4HANA invoice #INV-2026-901 ($450,000) against purchase order PO-8812 and resolve tax discrepancy.";
        } else if (type === "supply_chain") {
            companySelect.value = "KKR-LOGISTICS-03";
            promptInput.value = "Multi-Modal Freight Supply Chain Rerouting. Port bottleneck detected at Long Beach; reroute 1,200 TEU container buffer via Oakland rail link.";
        }
    }

    runOrchestrationStream() {
        const prompt = document.getElementById("promptInput").value.trim();
        const portfolioCompanyId = document.getElementById("portfolioCompany").value;
        const btnRun = document.getElementById("btnRun");

        if (!prompt) {
            alert("Please enter an operational request or prompt.");
            return;
        }

        // Close any existing event stream
        if (this.activeEventSource) {
            this.activeEventSource.close();
        }

        this.clearTerminal();
        this.resetTopologyNodes();
        
        btnRun.disabled = true;
        btnRun.innerHTML = '<span>Executing FCoT Engine...</span>';

        const queryUrl = `/api/chat/stream?prompt=${encodeURIComponent(prompt)}&portfolio_company_id=${encodeURIComponent(portfolioCompanyId)}`;
        this.activeEventSource = new EventSource(queryUrl);

        this.activeEventSource.onmessage = (event) => {
            try {
                const dataFrame = JSON.parse(event.data);
                this.handleStreamFrame(dataFrame);
            } catch (err) {
                console.error("Stream parse error:", err);
            }
        };

        this.activeEventSource.onerror = (err) => {
            console.log("Stream connection completed.");
            this.activeEventSource.close();
            btnRun.disabled = false;
            btnRun.innerHTML = '<span>Execute FCoT Engine</span>';
        };
    }

    handleStreamFrame(rpcFrame) {
        const { method, params } = rpcFrame;

        switch (method) {
            case "onAgentThought":
                this.appendTraceLog("thought", params.author, params.message);
                this.highlightTopologyNode(params.author);
                break;

            case "onAgentDelegation":
                this.appendTraceLog("delegation", params.author, `Delegating to [${params.target}]: ${params.message}`);
                this.highlightTopologyNode(params.author);
                this.highlightTopologyNode(params.target);
                break;

            case "onToolCall":
                this.appendTraceLog("tool", params.author, `Invoking Tool [${params.tool}]`);
                this.highlightTopologyNode(params.author);
                break;

            case "onFCoTPlanDelivery":
                this.appendTraceLog("delivery", params.author, "FCoT Execution Plan Generated Successfully.");
                this.renderFCoTPlan(params.execution_plan);
                break;

            case "onUiComponentDelivery":
                this.buildDeclarativeWidget(params.payload);
                break;

            default:
                console.warn("Unhandled stream method:", method);
        }
    }

    appendTraceLog(type, author, text) {
        const terminalBody = document.getElementById("terminalStream");
        
        // Remove welcome line if present
        const welcome = terminalBody.querySelector(".terminal-welcome");
        if (welcome) welcome.remove();

        const line = document.createElement("div");
        line.className = `trace-line ${type}`;
        line.innerHTML = `<strong>[${author}]</strong> ${text}`;
        terminalBody.appendChild(line);
        terminalBody.scrollTop = terminalBody.scrollHeight;
    }

    clearTerminal() {
        const terminalBody = document.getElementById("terminalStream");
        terminalBody.innerHTML = '<div class="terminal-welcome">System ready. Select a scenario preset or enter a prompt to launch the 3-Tiered FCoT Engine.</div>';
    }

    highlightTopologyNode(authorName) {
        if (!authorName) return;
        const nameLower = authorName.toLowerCase();

        if (nameLower.includes("ebitda")) document.getElementById("node-ebitda")?.classList.add("active");
        if (nameLower.includes("gov")) document.getElementById("node-gov")?.classList.add("active");
        if (nameLower.includes("decomposer")) document.getElementById("node-decomposer")?.classList.add("active");
        if (nameLower.includes("data-bridge") || nameLower.includes("databridge")) document.getElementById("node-databridge")?.classList.add("active");
        if (nameLower.includes("action") || nameLower.includes("runner")) document.getElementById("node-actionrunner")?.classList.add("active");
        if (nameLower.includes("verification") || nameLower.includes("guard")) document.getElementById("node-verification")?.classList.add("active");
    }

    resetTopologyNodes() {
        document.querySelectorAll(".node-pill").forEach(node => node.classList.remove("active"));
    }

    renderFCoTPlan(planData) {
        const plan = planData.fcot_execution_plan;
        const container = document.getElementById("outputContainer");
        
        container.innerHTML = `
            <div class="plan-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:12px; margin-bottom:16px;">
                <div>
                    <h3 style="font-size:18px; font-weight:700;">Task ID: ${plan.task_id.substring(0, 13)}...</h3>
                    <span style="font-size:12px; color:var(--text-secondary);">Company: ${plan.portfolio_company_id} | Complexity: <strong>${plan.complexity_tier}</strong></span>
                </div>
                <div style="background:rgba(16, 185, 129, 0.15); border:1px solid rgba(16, 185, 129, 0.4); padding:8px 14px; border-radius:8px;">
                    <div style="font-size:10px; color:var(--accent-green); font-weight:700;">PROJECTED EBITDA IMPACT</div>
                    <div style="font-size:15px; font-weight:700; color:#fff;">${plan.projected_ebitda_impact}</div>
                </div>
            </div>

            <!-- 3-Tier Execution Breakdown -->
            <div class="tier-summary-grid" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-bottom:16px;">
                <div style="background:rgba(15,23,42,0.6); padding:12px; border-radius:8px; border:1px solid var(--border-color);">
                    <h4 style="font-size:12px; color:var(--accent-blue); margin-bottom:6px;">L1 Strategic Steering</h4>
                    <p style="font-size:13px; font-weight:600;">${plan.level_1_strategic_steering.objective}</p>
                    <div style="margin-top:8px;"><span class="badge badge-success">Gov: ${plan.level_1_strategic_steering.governance_check}</span></div>
                </div>
                
                <div style="background:rgba(15,23,42,0.6); padding:12px; border-radius:8px; border:1px solid var(--border-color);">
                    <h4 style="font-size:12px; color:var(--accent-purple); margin-bottom:6px;">L2 Domain Blueprint</h4>
                    <p style="font-size:13px; font-weight:600;">Blueprint: ${plan.level_2_domain_blueprint.selected_blueprint}</p>
                    <div style="margin-top:8px; font-size:11px; color:var(--text-secondary);">${plan.level_2_domain_blueprint.data_grounding_sources.length} Data Sources Grounded</div>
                </div>

                <div style="background:rgba(15,23,42,0.6); padding:12px; border-radius:8px; border:1px solid var(--border-color);">
                    <h4 style="font-size:12px; color:var(--accent-green); margin-bottom:6px;">L3 Action Execution</h4>
                    <p style="font-size:13px; font-weight:600;">${plan.level_3_runtime_execution.actions_executed.length} Execution Steps Verified</p>
                    <div style="margin-top:8px;"><span class="badge badge-success">Self-Healing R1 Active</span></div>
                </div>
            </div>

            <!-- FCoT Master Seed Loop & Rubric Container -->
            ${plan.fcot_master_seed_protocol ? `
                <div style="background:rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.3); border-radius:8px; padding:14px; margin-bottom:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h4 style="font-size:14px; font-weight:700; color:var(--accent-purple);">FCoT Master Seed Protocol (3 Iterations Completed)</h4>
                        <span class="badge badge-success" style="font-size:12px;">Quality Score: ${plan.fcot_master_seed_protocol.final_rubric_evaluation.Overall_Quality_Score} / 5.0 (Passed)</span>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
                        ${plan.fcot_master_seed_protocol.iterations.map(it => `
                            <div style="background:rgba(15,23,42,0.8); padding:10px; border-radius:6px; border:1px solid var(--border-color); font-size:11px;">
                                <div style="font-weight:700; color:var(--accent-cyan); margin-bottom:4px;">Iteration ${it.iteration} (Macro/Meso/Micro)</div>
                                <div style="color:var(--text-secondary); margin-bottom:4px;"><strong>Gap Misses:</strong> ${it.gap_analysis_and_misses}</div>
                                <div style="color:var(--accent-green);"><strong>f_max:</strong> ${it.hillclimbing_objectives.f_max_maximization.substring(0, 50)}...</div>
                                <div style="color:var(--accent-amber);"><strong>f_min:</strong> ${it.hillclimbing_objectives.f_min_minimization.substring(0, 50)}...</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    buildDeclarativeWidget(payload) {
        const container = document.getElementById("outputContainer");

        if (payload.type === "Tabs") {
            const tabsWrapper = document.createElement("div");
            tabsWrapper.className = "ui-tabs-container";

            const nav = document.createElement("div");
            nav.className = "ui-tabs-nav";

            payload.components.forEach((comp, idx) => {
                const btn = document.createElement("button");
                btn.className = `tab-btn ${idx === 0 ? 'active' : ''}`;
                btn.innerText = comp.title;
                btn.onclick = () => {
                    tabsWrapper.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
                    tabsWrapper.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
                    btn.classList.add("active");
                    document.getElementById(`tab-content-${idx}`).classList.add("active");
                };
                nav.appendChild(btn);
            });

            tabsWrapper.appendChild(nav);

            payload.components.forEach((comp, idx) => {
                const contentDiv = document.createElement("div");
                contentDiv.id = `tab-content-${idx}`;
                contentDiv.className = `tab-content ${idx === 0 ? 'active' : ''}`;

                if (comp.type === "Table") {
                    let tableHtml = '<table class="ui-table"><thead><tr>';
                    comp.headers.forEach(h => tableHtml += `<th>${h}</th>`);
                    tableHtml += '</tr></thead><tbody>';
                    comp.rows.forEach(r => {
                        tableHtml += '<tr>';
                        r.forEach(cell => tableHtml += `<td>${cell}</td>`);
                        tableHtml += '</tr>';
                    });
                    tableHtml += '</tbody></table>';
                    contentDiv.innerHTML = tableHtml;
                } else if (comp.type === "Card") {
                    contentDiv.innerHTML = `<div style="background:rgba(15,23,42,0.8); padding:16px; border-radius:8px; border:1px solid var(--border-color); font-family:var(--font-mono); font-size:12px; line-height:1.6; white-space:pre-wrap;">${comp.content}</div>`;
                }

                tabsWrapper.appendChild(contentDiv);
            });

            container.appendChild(tabsWrapper);
        }
    }

    async fetchAndRenderReport() {
        const modal = document.getElementById("reportModal");
        const modalBody = document.getElementById("reportModalBody");
        modal.classList.add("active");
        modalBody.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">Loading report data...</div>';

        try {
            const res = await fetch('/api/report');
            const data = await res.json();

            document.getElementById("reportTitle").innerText = data.title;
            document.getElementById("reportSubtitle").innerText = data.subtitle;

            let html = `
                <div style="background:rgba(15,23,42,0.6); padding:16px; border-radius:8px; border-left:4px solid var(--accent-blue); line-height:1.6; color:var(--text-primary);">
                    <strong style="color:var(--accent-blue); font-size:14px;">Executive Summary:</strong><br/>
                    ${data.executive_summary}
                </div>

                <div>
                    <h3 style="font-size:15px; font-weight:700; margin-bottom:12px; color:var(--text-primary);">Key Value Pillars for KKR Portfolio Companies</h3>
                    <table class="ui-table">
                        <thead>
                            <tr>
                                <th>Challenge</th>
                                <th>Legacy Approach</th>
                                <th>KKR Agentic Engine Solution</th>
                                <th>Financial & Operational Impact</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.value_pillars.map(p => `
                                <tr>
                                    <td><strong style="color:var(--accent-cyan);">${p.challenge}</strong></td>
                                    <td style="color:var(--text-secondary);">${p.legacy_approach}</td>
                                    <td>${p.solution}</td>
                                    <td><span class="badge badge-success">${p.impact}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div>
                    <h3 style="font-size:15px; font-weight:700; margin-bottom:12px; color:var(--text-primary);">3-Tiered Architecture & Agent Hierarchy</h3>
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
                        ${data.architecture_tiers.map((t, idx) => `
                            <div style="background:rgba(15,23,42,0.6); padding:14px; border-radius:8px; border:1px solid var(--border-color);">
                                <h4 style="font-size:13px; color:${idx === 0 ? 'var(--accent-blue)' : idx === 1 ? 'var(--accent-purple)' : 'var(--accent-green)'}; margin-bottom:6px;">${t.tier}</h4>
                                <div style="margin-bottom:8px;">
                                    ${t.agents.map(a => `<span class="badge" style="background:rgba(255,255,255,0.06); color:var(--text-primary); margin-right:4px;">${a}</span>`).join('')}
                                </div>
                                <p style="font-size:12px; color:var(--text-secondary); line-height:1.5;">${t.role}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <h3 style="font-size:15px; font-weight:700; margin-bottom:12px; color:var(--text-primary);">Concrete Asset Impact Walkthroughs</h3>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        ${data.concrete_walkthroughs.map(w => `
                            <div style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.25); padding:14px; border-radius:8px;">
                                <div style="font-size:11px; font-weight:700; color:var(--accent-green); uppercase;">${w.sector}</div>
                                <h4 style="font-size:14px; font-weight:700; margin:4px 0;">${w.scenario}</h4>
                                <div style="font-size:12px; color:var(--text-secondary); margin-top:6px;">
                                    Latency/Error Impact: <strong>${w.latency_reduction || w.error_rate_reduction}</strong>
                                </div>
                                <div style="font-size:13px; font-weight:700; color:#fff; margin-top:4px;">
                                    EBITDA Impact: ${w.financial_impact}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            modalBody.innerHTML = html;
        } catch (err) {
            console.error("Report fetch error:", err);
            modalBody.innerHTML = '<div style="color:var(--accent-red); padding:20px;">Failed to load report data.</div>';
        }
    }
}

const uiEngine = new MultiAgentDynamicUiEngine();

function setPreset(type) {
    uiEngine.setPreset(type);
}

function runOrchestrationStream() {
    uiEngine.runOrchestrationStream();
}

function clearTerminal() {
    uiEngine.clearTerminal();
}

function openReportModal() {
    uiEngine.fetchAndRenderReport();
}

function closeReportModal(event) {
    if (event && event.target !== document.getElementById("reportModal") && !event.target.classList.contains("btn-close")) {
        return;
    }
    document.getElementById("reportModal").classList.remove("active");
}

