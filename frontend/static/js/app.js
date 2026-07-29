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
        this.currentPlan = plan;
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

            <!-- 3-Tier Interactive Execution Breakdown -->
            <div class="tier-summary-grid" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-bottom:16px;">
                <div onclick="openApertureDetail('l1')" style="background:rgba(15,23,42,0.6); padding:14px; border-radius:8px; border:1px solid var(--border-highlight); cursor:pointer; transition:all 0.2s;" title="Click to inspect Macro / L1 Strategic Telemetry">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <h4 style="font-size:12px; color:var(--accent-blue);">L1 Strategic Steering (Macro)</h4>
                        <span style="font-size:10px; color:var(--accent-blue);">🔍 Inspect</span>
                    </div>
                    <p style="font-size:13px; font-weight:600; margin-bottom:8px;">${plan.level_1_strategic_steering.objective}</p>
                    <div style="display:flex; gap:6px;"><span class="badge badge-success">Gov: ${plan.level_1_strategic_steering.governance_check}</span></div>
                </div>
                
                <div onclick="openApertureDetail('l2')" style="background:rgba(15,23,42,0.6); padding:14px; border-radius:8px; border:1px solid var(--border-highlight); cursor:pointer; transition:all 0.2s;" title="Click to inspect Meso / L2 Blueprint & Data Bridge Telemetry">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <h4 style="font-size:12px; color:var(--accent-purple);">L2 Domain Blueprint (Meso)</h4>
                        <span style="font-size:10px; color:var(--accent-purple);">🔍 Inspect</span>
                    </div>
                    <p style="font-size:13px; font-weight:600; margin-bottom:8px;">Blueprint: ${plan.level_2_domain_blueprint.selected_blueprint}</p>
                    <div style="font-size:11px; color:var(--text-secondary);">${plan.level_2_domain_blueprint.data_grounding_sources.length} Data Sources Grounded</div>
                </div>

                <div onclick="openApertureDetail('l3')" style="background:rgba(15,23,42,0.6); padding:14px; border-radius:8px; border:1px solid var(--border-highlight); cursor:pointer; transition:all 0.2s;" title="Click to inspect Micro / L3 Action Execution Telemetry">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <h4 style="font-size:12px; color:var(--accent-green);">L3 Action Execution (Micro)</h4>
                        <span style="font-size:10px; color:var(--accent-green);">🔍 Inspect</span>
                    </div>
                    <p style="font-size:13px; font-weight:600; margin-bottom:8px;">${plan.level_3_runtime_execution.actions_executed.length} Execution Steps Verified</p>
                    <div style="display:flex; gap:6px;"><span class="badge badge-success">Self-Healing R1 Active</span></div>
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
                        ${plan.fcot_master_seed_protocol.iterations.map((it, idx) => `
                            <div onclick="openIterationDetail(${idx})" style="background:rgba(15,23,42,0.8); padding:12px; border-radius:6px; border:1px solid var(--border-color); font-size:11px; cursor:pointer; transition:all 0.2s;" title="Click to inspect Iteration ${it.iteration} Telemetry">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                    <span style="font-weight:700; color:var(--accent-cyan);">Iteration ${it.iteration}</span>
                                    <span style="font-size:9px; color:var(--accent-cyan);">🔍 Details</span>
                                </div>
                                <div style="color:var(--text-secondary); margin-bottom:4px;"><strong>Gap Misses:</strong> ${it.gap_analysis_and_misses.substring(0, 45)}...</div>
                                <div style="color:var(--accent-green);"><strong>f_max:</strong> ${it.hillclimbing_objectives.f_max_maximization.substring(0, 40)}...</div>
                                <div style="color:var(--accent-amber);"><strong>f_min:</strong> ${it.hillclimbing_objectives.f_min_minimization.substring(0, 40)}...</div>
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

    openApertureDetail(type) {
        const modal = document.getElementById("apertureModal");
        const modalBody = document.getElementById("apertureModalBody");
        const titleEl = document.getElementById("apertureTitle");
        const subEl = document.getElementById("apertureSubtitle");
        modal.classList.add("active");

        const plan = this.currentPlan || {
            level_1_strategic_steering: { objective: "Healthcare Claims Pre-Authorization", governance_check: "HITL_REQUIRED", success_metric: "Cycle time reduced from 96h to <10m" },
            level_2_domain_blueprint: { selected_blueprint: "Medical_PreAuth_Verification_v4", data_grounding_sources: ["AS400 Mainframe Terminal API", "Epic EHR FHIR Endpoint"], workflow_dag: [{step:1, action:"Ingest clinical notes", tool:"Agentic_Data_Bridge"}, {step:2, action:"Match ICD-10 codings", tool:"Schema_Translator"}, {step:3, action:"Submit prior-auth payload", tool:"Submit_Prior_Auth_API"}] },
            level_3_runtime_execution: { parallel_hypotheses_evaluated: [{hypothesis_id:"H1", confidence:0.68, selected:false, reason:"Failed medical necessity threshold"}, {hypothesis_id:"H2", confidence:0.97, selected:true, reason:"Matched historical BigQuery prior-auth rules"}], actions_executed: [{step_id:1, tool_called:"Agentic_Data_Bridge_FHIR", status:"SUCCESS", runtime_verification:"PASSED"}, {step_id:2, tool_called:"Schema_Translator_ICD10", status:"SUCCESS", runtime_verification:"Matched ICD-10 codes 99.1%"}, {step_id:3, tool_called:"Submit_Prior_Auth_API", status:"SUCCESS", runtime_verification:"Ref #PA-2026-991208 returned"}] },
            projected_ebitda_impact: "$1.2M Annual OPEX reduction"
        };

        if (type === 'l1') {
            titleEl.innerText = "Macro Aperture: Level 1 Executive & Strategic Steering";
            subEl.innerText = "Financial EBITDA Targets, Governance Safeguards & SLA Thresholds";
            modalBody.innerHTML = `
                <div style="background:rgba(59,130,246,0.1); border:1px solid var(--accent-blue); padding:16px; border-radius:8px;">
                    <div style="font-size:11px; color:var(--accent-blue); font-weight:700;">MACRO APERTURE OBJECTIVE</div>
                    <h3 style="font-size:16px; font-weight:700; margin:6px 0;">${plan.level_1_strategic_steering.objective}</h3>
                    <div style="font-size:13px; color:var(--accent-green); font-weight:700;">Projected Impact: ${plan.projected_ebitda_impact}</div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div style="background:rgba(15,23,42,0.6); padding:14px; border-radius:8px; border:1px solid var(--border-color);">
                        <h4 style="font-size:13px; color:var(--text-secondary);">Governance & Compliance Boundary</h4>
                        <div style="margin-top:6px;"><span class="badge badge-success">Status: ${plan.level_1_strategic_steering.governance_check}</span></div>
                        <p style="font-size:12px; color:var(--text-muted); margin-top:8px;">Enforces Zero-Trust compliance sidecar and HITL threshold authorization for transactions > $25,000.</p>
                    </div>

                    <div style="background:rgba(15,23,42,0.6); padding:14px; border-radius:8px; border:1px solid var(--border-color);">
                        <h4 style="font-size:13px; color:var(--text-secondary);">Target SLA Success Metric</h4>
                        <p style="font-size:13px; font-weight:700; color:#fff; margin-top:6px;">${plan.level_1_strategic_steering.success_metric}</p>
                    </div>
                </div>

                <div style="background:rgba(15,23,42,0.6); padding:14px; border-radius:8px; border:1px solid var(--border-color);">
                    <h4 style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">Active Steering Agents</h4>
                    <div style="display:flex; gap:8px;">
                        <span class="node-pill active">EBITDA-Optimizer-Agent</span>
                        <span class="node-pill active">Portfolio-Governance-Overseer</span>
                    </div>
                </div>
            `;
        } else if (type === 'l2') {
            titleEl.innerText = "Meso Aperture: Level 2 Domain Blueprint & Integration";
            subEl.innerText = "Agentic Data Cloud Federated Grounding & Dynamic Workflow DAG Synthesis";
            modalBody.innerHTML = `
                <div style="background:rgba(139,92,246,0.1); border:1px solid var(--accent-purple); padding:16px; border-radius:8px;">
                    <div style="font-size:11px; color:var(--accent-purple); font-weight:700;">SELECTED DOMAIN BLUEPRINT</div>
                    <h3 style="font-size:16px; font-weight:700; margin:6px 0;">${plan.level_2_domain_blueprint.selected_blueprint}</h3>
                </div>

                <div>
                    <h4 style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">Agentic Data Cloud Grounding Sources (Zero DB Refactoring)</h4>
                    <ul style="list-style:none; display:flex; flex-direction:column; gap:6px;">
                        ${plan.level_2_domain_blueprint.data_grounding_sources.map(src => `
                            <li style="background:rgba(15,23,42,0.6); padding:10px 14px; border-radius:6px; border:1px solid var(--border-color); font-size:12px; font-family:var(--font-mono); color:var(--accent-cyan);">🌐 ${src}</li>
                        `).join('')}
                    </ul>
                </div>

                <div>
                    <h4 style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">Synthesized Execution Workflow DAG</h4>
                    <table class="ui-table">
                        <thead>
                            <tr>
                                <th>Step #</th>
                                <th>Action Description</th>
                                <th>Target Integration Tool</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${plan.level_2_domain_blueprint.workflow_dag.map(step => `
                                <tr>
                                    <td><strong>Step ${step.step}</strong></td>
                                    <td>${step.action}</td>
                                    <td><span class="badge" style="background:rgba(139,92,246,0.2); color:var(--accent-purple); font-family:var(--font-mono);">${step.tool}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else if (type === 'l3') {
            titleEl.innerText = "Micro Aperture: Level 3 Operational Action & Self-Healing Execution";
            subEl.innerText = "Parallel Hypotheses Evaluation ($H_1, H_2$), Action Runners & R1 Verification";
            modalBody.innerHTML = `
                <div>
                    <h4 style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">Parallel Hypotheses Evaluated ($H_1, H_2$)</h4>
                    <div class="hypothesis-grid">
                        ${plan.level_3_runtime_execution.parallel_hypotheses_evaluated.map(h => `
                            <div class="hypothesis-card ${h.selected ? 'selected' : ''}">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <strong style="font-size:14px; color:${h.selected ? 'var(--accent-green)' : 'var(--text-muted)'};">${h.hypothesis_id}</strong>
                                    <span class="badge ${h.selected ? 'badge-success' : 'badge-warning'}">Confidence: ${(h.confidence * 100).toFixed(0)}%</span>
                                </div>
                                <p style="font-size:12px; color:var(--text-secondary);">${h.reason}</p>
                                <div style="margin-top:6px; font-size:11px; font-weight:700; color:${h.selected ? 'var(--accent-green)' : 'var(--text-muted)'};">${h.selected ? 'SELECTED FOR EXECUTION' : 'DISCARDED'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <h4 style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">Actions Executed & Runtime Verification Checks</h4>
                    <table class="ui-table">
                        <thead>
                            <tr>
                                <th>Step</th>
                                <th>Tool Called</th>
                                <th>Execution Status</th>
                                <th>Runtime Verification & Self-Healing (R1)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${plan.level_3_runtime_execution.actions_executed.map(act => `
                                <tr>
                                    <td>#${act.step_id}</td>
                                    <td><span class="badge" style="background:rgba(16,185,129,0.15); color:var(--accent-green); font-family:var(--font-mono);">${act.tool_called}</span></td>
                                    <td><span class="badge badge-success">${act.status}</span></td>
                                    <td style="font-size:12px; color:var(--text-secondary);">${act.runtime_verification}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }

    openIterationDetail(idx) {
        const modal = document.getElementById("apertureModal");
        const modalBody = document.getElementById("apertureModalBody");
        const titleEl = document.getElementById("apertureTitle");
        const subEl = document.getElementById("apertureSubtitle");
        modal.classList.add("active");

        const iterations = this.currentPlan?.fcot_master_seed_protocol?.iterations || [
            { iteration: 1, apertures: { macro: "Macro Strategy", meso: "Meso Blueprint", micro: "Micro Execution" }, gap_analysis_and_misses: "Missed AS400 terminal lock timeouts", hillclimbing_objectives: { f_max_maximization: "Maximize schema mapping coverage", f_min_minimization: "Minimize latency" }, rubric_score: { S1_EBITDA: 4.5, S2_Schema: 4.0, S3_Healing: 4.2, S4_Objectives: 4.0, S5_GapMitigation: 4.1, Quality_Score: 4.16 } },
            { iteration: 2, apertures: { macro: "Enforced Governance", meso: "AS400 Schema Proxy", micro: "Hypothesis H2" }, gap_analysis_and_misses: "Secondary bottleneck in clearinghouse response", hillclimbing_objectives: { f_max_maximization: "Maximize clearance velocity", f_min_minimization: "Minimize double retries" }, rubric_score: { S1_EBITDA: 4.8, S2_Schema: 4.6, S3_Healing: 4.7, S4_Objectives: 4.5, S5_GapMitigation: 4.6, Quality_Score: 4.64 } },
            { iteration: 3, apertures: { macro: "Final EBITDA Target", meso: "100% Grounding", micro: "Verified PASSED" }, gap_analysis_and_misses: "Zero remaining operational gaps", hillclimbing_objectives: { f_max_maximization: "Optimal intelligence depth", f_min_minimization: "Zero security exfiltration risk" }, rubric_score: { S1_EBITDA: 5.0, S2_Schema: 4.9, S3_Healing: 5.0, S4_Objectives: 4.8, S5_GapMitigation: 4.9, Quality_Score: 4.92 } }
        ];

        const it = iterations[idx] || iterations[0];

        titleEl.innerText = `FCoT Master Seed Pass: Iteration ${it.iteration}`;
        subEl.innerText = "Macro / Meso / Micro Aperture Outputs, Gap Analysis & Dual Hillclimbing";

        modalBody.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
                <div style="background:rgba(59,130,246,0.1); border:1px solid var(--accent-blue); padding:12px; border-radius:8px;">
                    <div style="font-size:11px; color:var(--accent-blue); font-weight:700;">MACRO APERTURE</div>
                    <p style="font-size:12px; margin-top:4px;">${it.apertures.macro}</p>
                </div>
                <div style="background:rgba(139,92,246,0.1); border:1px solid var(--accent-purple); padding:12px; border-radius:8px;">
                    <div style="font-size:11px; color:var(--accent-purple); font-weight:700;">MESO APERTURE</div>
                    <p style="font-size:12px; margin-top:4px;">${it.apertures.meso}</p>
                </div>
                <div style="background:rgba(16,185,129,0.1); border:1px solid var(--accent-green); padding:12px; border-radius:8px;">
                    <div style="font-size:11px; color:var(--accent-green); font-weight:700;">MICRO APERTURE</div>
                    <p style="font-size:12px; margin-top:4px;">${it.apertures.micro}</p>
                </div>
            </div>

            <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.3); padding:14px; border-radius:8px;">
                <h4 style="font-size:13px; color:var(--accent-amber); margin-bottom:4px;">🔍 Self-Correction & Gap Analysis (Misses Identified)</h4>
                <p style="font-size:13px; color:var(--text-primary); line-height:1.5;">${it.gap_analysis_and_misses}</p>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.3); padding:14px; border-radius:8px;">
                    <h4 style="font-size:13px; color:var(--accent-green); margin-bottom:4px;">f_max (Maximization Function)</h4>
                    <p style="font-size:12px; color:var(--text-secondary); line-height:1.5;">${it.hillclimbing_objectives.f_max_maximization}</p>
                </div>

                <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); padding:14px; border-radius:8px;">
                    <h4 style="font-size:13px; color:var(--accent-red); margin-bottom:4px;">f_min (Minimization Function)</h4>
                    <p style="font-size:12px; color:var(--text-secondary); line-height:1.5;">${it.hillclimbing_objectives.f_min_minimization}</p>
                </div>
            </div>

            <div>
                <h4 style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">Iteration Assessment Rubric Score Breakdown</h4>
                <table class="ui-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Target Baseline</th>
                            <th>Iteration ${it.iteration} Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>S1: Strategic EBITDA Alignment</td>
                            <td>Quantifiable OPEX / Rev Target</td>
                            <td><span class="badge badge-success">${it.rubric_score.S1_EBITDA} / 5.0</span></td>
                        </tr>
                        <tr>
                            <td>S2: Schema Grounding Completeness</td>
                            <td>Zero Legacy DB Refactoring</td>
                            <td><span class="badge badge-success">${it.rubric_score.S2_Schema} / 5.0</span></td>
                        </tr>
                        <tr>
                            <td>S3: Execution Resilience & Healing</td>
                            <td>Local R1 Retry Success</td>
                            <td><span class="badge badge-success">${it.rubric_score.S3_Healing} / 5.0</span></td>
                        </tr>
                        <tr>
                            <td>S4: Dual Objective Optimization</td>
                            <td>Balanced f_max / f_min Trade-off</td>
                            <td><span class="badge badge-success">${it.rubric_score.S4_Objectives} / 5.0</span></td>
                        </tr>
                        <tr>
                            <td>S5: Gap Mitigation Velocity</td>
                            <td>Zero Repeated Errors</td>
                            <td><span class="badge badge-success">${it.rubric_score.S5_GapMitigation} / 5.0</span></td>
                        </tr>
                        <tr style="background:rgba(139,92,246,0.15);">
                            <td><strong>Overall Quality Score (Q)</strong></td>
                            <td><strong>Pass Threshold Q ≥ 4.2</strong></td>
                            <td><strong style="color:var(--accent-purple); font-size:14px;">${it.rubric_score.Quality_Score} / 5.0</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }
}

const uiEngine = new MultiAgentDynamicUiEngine();

function setPreset(type) {
    uiEngine.setPreset(type);
    async fetchAndRenderPortfolioHealth() {
        const modal = document.getElementById("portfolioHealthModal");
        const modalBody = document.getElementById("portfolioHealthModalBody");
        modal.classList.add("active");
        modalBody.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">Loading KKR portfolio health telemetry...</div>';

        try {
            const res = await fetch('/api/portfolio/health');
            const data = await res.json();
            const summary = data.portfolio_summary;
            const ventures = data.business_ventures;

            let html = `
                <!-- Top Summary EBITDA Cards -->
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; margin-bottom:16px;">
                    <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.4); padding:16px; border-radius:10px;">
                        <div style="font-size:11px; color:var(--accent-green); font-weight:700;">TOTAL ANNUAL EBITDA IMPACT</div>
                        <div style="font-size:24px; font-weight:800; color:#fff; margin-top:4px;">${summary.total_annual_ebitda_impact}</div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:4px;">Direct OPEX Savings + Velocity</div>
                    </div>

                    <div style="background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.4); padding:16px; border-radius:10px;">
                        <div style="font-size:11px; color:var(--accent-blue); font-weight:700;">PORTFOLIO HEALTH SCORE</div>
                        <div style="font-size:24px; font-weight:800; color:#fff; margin-top:4px;">${summary.aggregate_health_score}</div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:4px;">${summary.active_ventures_count} Active Portfolio Assets</div>
                    </div>

                    <div style="background:rgba(139,92,246,0.12); border:1px solid rgba(139,92,246,0.4); padding:16px; border-radius:10px;">
                        <div style="font-size:11px; color:var(--accent-purple); font-weight:700;">GROUNDED LEGACY STACKS</div>
                        <div style="font-size:24px; font-weight:800; color:#fff; margin-top:4px;">4 Legacy DBs</div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:4px;">Zero Schema Refactoring</div>
                    </div>

                    <div style="background:rgba(6,182,212,0.12); border:1px solid rgba(6,182,212,0.4); padding:16px; border-radius:10px;">
                        <div style="font-size:11px; color:var(--accent-cyan); font-weight:700;">PROCESS VELOCITY GAIN</div>
                        <div style="font-size:24px; font-weight:800; color:#fff; margin-top:4px;">${summary.velocity_gain}</div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:4px;">60–90 Day Deployment</div>
                    </div>
                </div>

                <!-- Business Ventures KPI Table -->
                <div>
                    <h3 style="font-size:15px; font-weight:700; margin-bottom:12px; color:var(--text-primary);">KKR Major Business Ventures & Active Use Case Telemetry</h3>
                    <div style="display:flex; flex-direction:column; gap:14px;">
                        ${ventures.map(v => `
                            <div style="background:rgba(15,23,42,0.7); border:1px solid var(--border-color); border-radius:10px; padding:18px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:10px; margin-bottom:12px;">
                                    <div>
                                        <div style="font-size:11px; font-weight:700; color:var(--accent-cyan); uppercase;">${v.id} | ${v.sector}</div>
                                        <h4 style="font-size:16px; font-weight:700; color:#fff; margin-top:2px;">${v.name}</h4>
                                    </div>
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <span class="badge badge-success" style="font-size:12px; padding:6px 12px;">Health: ${v.health_score}</span>
                                        <span class="badge" style="background:rgba(59,130,246,0.2); color:var(--accent-blue); font-size:11px;">${v.governance_status}</span>
                                    </div>
                                </div>

                                <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; font-size:12px;">
                                    <div>
                                        <div style="color:var(--text-muted); font-size:11px;">CORE USE CASE</div>
                                        <div style="font-weight:600; color:var(--text-primary); margin-top:2px;">${v.core_use_case}</div>
                                    </div>
                                    <div>
                                        <div style="color:var(--text-muted); font-size:11px;">LEGACY STACK GROUNDED</div>
                                        <div style="font-weight:600; color:var(--accent-purple); font-family:var(--font-mono); margin-top:2px;">${v.legacy_infrastructure}</div>
                                    </div>
                                    <div>
                                        <div style="color:var(--text-muted); font-size:11px;">KPI IMPROVEMENT</div>
                                        <div style="font-weight:700; color:var(--accent-green); margin-top:2px;">${v.kpi_baseline} ➔ ${v.kpi_current} (${v.kpi_improvement})</div>
                                    </div>
                                    <div>
                                        <div style="color:var(--text-muted); font-size:11px;">PROJECTED EBITDA GAIN</div>
                                        <div style="font-weight:800; color:#fff; font-size:14px; margin-top:2px;">${v.ebitda_impact}</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            modalBody.innerHTML = html;
        } catch (err) {
            console.error("Portfolio health fetch error:", err);
            modalBody.innerHTML = '<div style="color:var(--accent-red); padding:20px;">Failed to load portfolio health telemetry.</div>';
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

function openApertureDetail(type) {
    uiEngine.openApertureDetail(type);
}

function openIterationDetail(idx) {
    uiEngine.openIterationDetail(idx);
}

function closeApertureModal(event) {
    if (event && event.target !== document.getElementById("apertureModal") && !event.target.classList.contains("btn-close")) {
        return;
    }
    document.getElementById("apertureModal").classList.remove("active");
}

function openPortfolioHealthModal() {
    uiEngine.fetchAndRenderPortfolioHealth();
}

function closePortfolioHealthModal(event) {
    if (event && event.target !== document.getElementById("portfolioHealthModal") && !event.target.classList.contains("btn-close")) {
        return;
    }
    document.getElementById("portfolioHealthModal").classList.remove("active");
}

function handleCompanySelectChange(val) {
    if (val === "KKR-HEALTHCARE-01") {
        uiEngine.setPreset("claims");
    } else if (val === "KKR-FINANCE-02") {
        uiEngine.setPreset("procurement");
    } else if (val === "KKR-LOGISTICS-03") {
        uiEngine.setPreset("supply_chain");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Populate default scenario on initial page load
    const companySelect = document.getElementById("portfolioCompany");
    if (companySelect) {
        handleCompanySelectChange(companySelect.value);
    }
});




