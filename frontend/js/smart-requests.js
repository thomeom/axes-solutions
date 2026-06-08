(function () {
  const DRAFT_KEY = "ax.smartRequest.draft";
  const PROJECTS_KEY = "ax.smartRequest.projects";
  const ACTIVE_KEY = "ax.smartRequest.activeProject";
  const storage = window.AXStorage || {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  };
  const baseText = key => window.I18N?.base(key) || key;
  const terms = key => baseText(key).split("|").map(item => item.trim()).filter(Boolean);
  const hasAny = (text, key) => terms(key).some(item => text.includes(item));

  const statusOrder = ["new", "in_progress", "review", "done", "cancelled"];
  const allowedServices = ["hr", "it", "accounting", "legal"];
  let specialistCatalog = [];

  const fallbackSpecialists = [
    {
      name: "Nikita Romanov",
      service: "it",
      specialization: "Backend and CRM integrations",
      skills: ["FastAPI", "Python", "API", "CRM", "Databases"],
      keywords: ["backend", "api", "crm", "integration", "automation", "database", "python", "fastapi"],
      experience_years: 7,
      rating: 4.9,
      availability_status: "available",
      photo: "../img/specialists/nikita-romanov.jpg",
      projects_completed: 38
    },
    {
      name: "Maria Kim",
      service: "it",
      specialization: "QA automation and release quality",
      skills: ["QA", "Autotests", "Regression", "Release"],
      keywords: ["qa", "testing", "quality", "autotest", "regression", "release"],
      experience_years: 6,
      rating: 4.8,
      availability_status: "busy",
      photo: "../img/specialists/maria-kim.jpg",
      projects_completed: 31
    },
    {
      name: "Azamat Sadykov",
      service: "it",
      specialization: "System administration and infrastructure",
      skills: ["Servers", "Backups", "Email", "SSL", "Monitoring"],
      keywords: ["server", "backup", "email", "ssl", "monitoring", "infrastructure", "admin", "domain"],
      experience_years: 8,
      rating: 4.7,
      availability_status: "available",
      photo: "../img/specialists/azamat-sadykov.jpg",
      projects_completed: 33
    },
    {
      name: "Dmitry Alekseev",
      service: "it",
      specialization: "Backend development and internal systems",
      skills: ["Backend", "Databases", "CRM", "Integrations"],
      keywords: ["backend", "database", "crm", "api", "integration", "internal", "service"],
      experience_years: 6,
      rating: 4.7,
      availability_status: "available",
      photo: "../img/specialists/dmitry-alekseev.jpg",
      projects_completed: 29
    },
    {
      name: "Laura Omarova",
      service: "it",
      specialization: "Frontend interfaces and forms",
      skills: ["Frontend", "Responsive UI", "Forms", "Animation"],
      keywords: ["frontend", "ui", "interface", "form", "responsive", "animation", "website"],
      experience_years: 5,
      rating: 4.6,
      availability_status: "available",
      photo: "../img/specialists/laura-omarova.jpg",
      projects_completed: 24
    },
    {
      name: "Ruslan Nurtayev",
      service: "it",
      specialization: "DevOps deployment and monitoring",
      skills: ["DevOps", "Deploy", "SSL", "Backups", "Monitoring"],
      keywords: ["devops", "deploy", "deployment", "ssl", "backup", "monitoring", "domain"],
      experience_years: 7,
      rating: 4.8,
      availability_status: "busy",
      photo: "../img/specialists/ruslan-nurtayev.jpg",
      projects_completed: 32
    },
    {
      name: "Alina Muratova",
      service: "hr",
      specialization: "Recruitment and HR operations",
      skills: ["Recruiting", "Onboarding", "HR docs", "Payroll"],
      keywords: ["recruiting", "vacancy", "onboarding", "hr", "payroll", "personnel", "staff"],
      experience_years: 8,
      rating: 4.9,
      availability_status: "available",
      photo: "../img/specialists/alina-muratova.jpg",
      projects_completed: 44
    },
    {
      name: "Erlan Kasymov",
      service: "hr",
      specialization: "HR administration and compliance",
      skills: ["HR records", "Labor docs", "SLA", "Reports"],
      keywords: ["hrdocs", "labor", "documents", "records", "compliance", "reports"],
      experience_years: 5,
      rating: 4.6,
      availability_status: "available",
      photo: "../img/specialists/erlan-kasymov.jpg",
      projects_completed: 28
    },
    {
      name: "Dana Seisenova",
      service: "hr",
      specialization: "Recruitment analytics",
      skills: ["Screening", "Interviews", "Dashboards", "Analytics"],
      keywords: ["recruiting", "screening", "interview", "analytics", "dashboard", "candidate"],
      experience_years: 6,
      rating: 4.8,
      availability_status: "available",
      photo: "../img/specialists/dana-seisenova.jpg",
      projects_completed: 36
    },
    {
      name: "Zhanna Akhmetova",
      service: "hr",
      specialization: "Employer brand and adaptation",
      skills: ["Adaptation", "Culture", "Employer brand", "Training"],
      keywords: ["adaptation", "brand", "culture", "training", "onboarding"],
      experience_years: 7,
      rating: 4.7,
      availability_status: "busy",
      photo: "../img/specialists/zhanna-akhmetova.jpg",
      projects_completed: 30
    },
    {
      name: "Ilya Borisov",
      service: "hr",
      specialization: "Onboarding and HR processes",
      skills: ["Onboarding", "HR docs", "Process maps", "Surveys"],
      keywords: ["onboarding", "hr", "process", "survey", "documents"],
      experience_years: 4,
      rating: 4.5,
      availability_status: "available",
      photo: "../img/specialists/ilya-borisov.jpg",
      projects_completed: 22
    },
    {
      name: "Madina Kozhakhmet",
      service: "hr",
      specialization: "Payroll and HR records",
      skills: ["Payroll", "Timesheets", "HR records", "Reports"],
      keywords: ["payroll", "salary", "timesheet", "records", "reports"],
      experience_years: 6,
      rating: 4.7,
      availability_status: "available",
      photo: "../img/specialists/madina-kozhakhmet.jpg",
      projects_completed: 34
    },
    {
      name: "Gulnara Abdiyeva",
      service: "accounting",
      specialization: "Payroll accounting",
      skills: ["Payroll", "Taxes", "Reports", "1C"],
      keywords: ["payroll", "salary", "tax", "accounting", "1c", "reports"],
      experience_years: 10,
      rating: 4.9,
      availability_status: "available",
      photo: "../img/specialists/gulnara-abdiyeva.jpg",
      projects_completed: 52
    },
    {
      name: "Timur Musin",
      service: "accounting",
      specialization: "Management reporting",
      skills: ["Management reports", "BI", "Forecast", "Audit"],
      keywords: ["management", "reporting", "bi", "forecast", "audit", "finance"],
      experience_years: 8,
      rating: 4.8,
      availability_status: "busy",
      photo: "../img/specialists/timur-musin.jpg",
      projects_completed: 41
    },
    {
      name: "Saule Nurpeisova",
      service: "accounting",
      specialization: "Tax accounting",
      skills: ["Taxes", "Declarations", "Compliance", "1C"],
      keywords: ["tax", "declaration", "compliance", "accounting", "1c"],
      experience_years: 9,
      rating: 4.8,
      availability_status: "available",
      photo: "../img/specialists/saule-nurpeisova.jpg",
      projects_completed: 46
    },
    {
      name: "Viktor Li",
      service: "accounting",
      specialization: "Primary documents",
      skills: ["Primary docs", "Reconciliation", "Invoices", "Acts"],
      keywords: ["documents", "invoice", "acts", "reconciliation", "primary"],
      experience_years: 6,
      rating: 4.6,
      availability_status: "available",
      photo: "../img/specialists/viktor-li.jpg",
      projects_completed: 32
    },
    {
      name: "Ainur Kenzheeva",
      service: "accounting",
      specialization: "Accounting recovery",
      skills: ["Recovery", "Audit", "Registers", "1C"],
      keywords: ["recovery", "audit", "register", "1c", "accounting"],
      experience_years: 7,
      rating: 4.7,
      availability_status: "available",
      photo: "../img/specialists/ainur-kenzheeva.jpg",
      projects_completed: 35
    },
    {
      name: "Lyazzat Sarsenova",
      service: "accounting",
      specialization: "Accounting automation",
      skills: ["Automation", "1C", "Reports", "Integrations"],
      keywords: ["automation", "1c", "integration", "reporting", "accounting"],
      experience_years: 8,
      rating: 4.7,
      availability_status: "busy",
      photo: "../img/specialists/lyazzat-sarsenova.jpg",
      projects_completed: 37
    },
    {
      name: "Rustam Tulegenov",
      service: "legal",
      specialization: "Contracts and corporate law",
      skills: ["Contracts", "Corporate law", "NDA", "Negotiations"],
      keywords: ["contract", "corporate", "nda", "legal", "negotiation", "agreement"],
      experience_years: 11,
      rating: 4.9,
      availability_status: "available",
      photo: "../img/specialists/rustam-tulegenov.jpg",
      projects_completed: 57
    },
    {
      name: "Aigerim Esenova",
      service: "legal",
      specialization: "Labor law",
      skills: ["Labor law", "Employment docs", "Disputes", "Compliance"],
      keywords: ["labor", "employment", "dispute", "compliance", "contract"],
      experience_years: 9,
      rating: 4.8,
      availability_status: "available",
      photo: "../img/specialists/aigerim-esenova.jpg",
      projects_completed: 43
    },
    {
      name: "Kamila Nurlan",
      service: "legal",
      specialization: "Claims and dispute support",
      skills: ["Claims", "Disputes", "Letters", "Evidence"],
      keywords: ["claim", "dispute", "letter", "evidence", "legal"],
      experience_years: 6,
      rating: 4.6,
      availability_status: "available",
      photo: "../img/specialists/kamila-nurlan.jpg",
      projects_completed: 29
    },
    {
      name: "Mikhail Sokolov",
      service: "legal",
      specialization: "Document registration",
      skills: ["Registration", "Licenses", "Government portals", "Docs"],
      keywords: ["registration", "license", "portal", "document", "legal"],
      experience_years: 7,
      rating: 4.7,
      availability_status: "busy",
      photo: "../img/specialists/mikhail-sokolov.jpg",
      projects_completed: 34
    },
    {
      name: "Diana Rakhimova",
      service: "legal",
      specialization: "Compliance and policies",
      skills: ["Compliance", "Policies", "Risk", "Internal docs"],
      keywords: ["compliance", "policy", "risk", "internal", "documents"],
      experience_years: 8,
      rating: 4.8,
      availability_status: "available",
      photo: "../img/specialists/diana-rakhimova.jpg",
      projects_completed: 39
    },
    {
      name: "Arman Suleimenov",
      service: "legal",
      specialization: "Registration and corporate changes",
      skills: ["Registration", "Corporate changes", "Charter", "Applications"],
      keywords: ["registration", "corporate", "charter", "application", "changes"],
      experience_years: 5,
      rating: 4.5,
      availability_status: "available",
      photo: "../img/specialists/arman-suleimenov.jpg",
      projects_completed: 25
    }
  ];

  const serviceKeywords = {
    it: terms("search.service.it"),
    accounting: terms("search.service.accounting"),
    legal: terms("search.service.legal"),
    hr: terms("search.service.hr")
  };

  const serviceStacks = {
    it: ["frontend", "backend", "mobile", "qa", "devops", "uiux", "crmErp", "aiAutomation"],
    hr: ["recruiting", "hrDocs", "onboarding", "hrEvaluation", "hrBrand", "payroll"],
    accounting: ["taxAccounting", "salary", "primaryDocs", "oneC", "managementReporting", "accountingRecovery"],
    legal: ["contracts", "nda", "corporateLaw", "laborLaw", "claims", "documentRegistration"]
  };

  const costProfiles = {
    it: {
      monthlyRates: { junior: 650000, middle: 1050000, senior: 1650000 },
      staffSalary: { junior: 520000, middle: 900000, senior: 1350000 },
      defaultTeam: { junior: 1, middle: 1, senior: 1 }
    },
    hr: {
      monthlyRates: { junior: 360000, middle: 590000, senior: 880000 },
      staffSalary: { junior: 320000, middle: 520000, senior: 760000 },
      defaultTeam: { junior: 0, middle: 1, senior: 1 }
    },
    accounting: {
      monthlyRates: { junior: 310000, middle: 520000, senior: 820000 },
      staffSalary: { junior: 280000, middle: 460000, senior: 700000 },
      defaultTeam: { junior: 1, middle: 1, senior: 0 }
    },
    legal: {
      monthlyRates: { junior: 340000, middle: 620000, senior: 980000 },
      staffSalary: { junior: 300000, middle: 540000, senior: 840000 },
      defaultTeam: { junior: 0, middle: 1, senior: 1 }
    }
  };

  const modelMultipliers = {
    outstaffing: 0.96,
    dedicated: 1.08,
    fixed: 1.18
  };

  const t = (key, values = {}) => {
    const raw = window.I18N?.t(key) || key;
    return Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, value),
      raw
    );
  };

  const serviceLabel = service => allowedServices.includes(service) ? t(`service.label.${service}`) : t("service.label.unknown");
  const statusLabel = status => t(`status.${status}`);
  const tagLabel = tag => t(`tag.${tag}`);
  const stackLabel = item => item === "notSure" ? t("smart.notSure") : t(`smart.stack.${item}`);
  const companySizeLabel = value => t(`smart.companySize.${value || "small"}`);
  const contactMethodLabel = value => t(`smart.contact.${value || "email"}`);
  const modelLabel = value => t(`smart.model.${value || "outstaffing"}`);
  const formatMoney = value => `${Math.round(value / 10000) * 10000}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const moneyLabel = value => `${formatMoney(value)} ₸`;
  const safeNumber = (value, fallback = 0, min = 0, max = 99) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.max(min, Math.min(parsed, max));
  };
  const api = async (path, opts = {}) => {
    if (window.AX?.api) return window.AX.api(path, opts);

    if (typeof fetch !== "function") {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(opts.method || "GET", `http://127.0.0.1:8000/api${path}`);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onload = () => {
          let data = null;
          try {
            data = JSON.parse(xhr.responseText || "null");
          } catch (_) {}

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data?.detail || `HTTP ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(opts.body || null);
      });
    }

    const res = await fetch(`http://127.0.0.1:8000/api${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {})
      }
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
    return data;
  };

  const readJson = (key, fallback) => {
    try {
      return JSON.parse(storage.getItem(key)) || fallback;
    } catch (_) {
      return fallback;
    }
  };

  const writeJson = (key, value) => {
    storage.setItem(key, JSON.stringify(value));
  };

  const escapeHtml = (value = "") =>
    String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));

  const splitItems = (text = "") =>
    text
      .split(/\n|;|\.|,/)
      .map(item => item.trim())
      .filter(item => item.length > 3);

  const unique = list => [...new Set(list.filter(Boolean))];

  const uniqueSpecialists = list => {
    const seen = new Set();
    return list.filter(item => {
      const key = `${item.name}-${item.service}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const loadSpecialists = async () => {
    try {
      specialistCatalog = await api("/specialists");
    } catch (_) {
      specialistCatalog = [];
    }

    specialistCatalog = uniqueSpecialists([
      ...(Array.isArray(specialistCatalog) ? specialistCatalog : []),
      ...fallbackSpecialists
    ]);
    return specialistCatalog;
  };

  const recommendationText = data => [
    data.service,
    data.title,
    data.description,
    data.outcome,
    data.currentProcess,
    data.notes,
    ...(data.tags || []),
    ...(data.stack || [])
  ].join(" ").toLowerCase();

  const recommendSpecialist = data => {
    if (!specialistCatalog.length) return null;

    const text = recommendationText(data);
    let best = null;

    specialistCatalog.forEach(specialist => {
      const keywords = [...(specialist.keywords || []), ...(specialist.skills || [])].map(item => String(item).toLowerCase());
      const matched = unique(keywords.filter(item => item && text.includes(item)));
      let score = 0;
      const reasons = [];

      if (specialist.service === data.service) {
        score += 40;
        reasons.push(t("ai.reason.service"));
      }
      if (matched.length) {
        score += Math.min(matched.length, 8) * 7;
        reasons.push(t("ai.reason.keywords"));
      }
      if (specialist.availability_status === "available") {
        score += 10;
        reasons.push(t("ai.reason.available"));
      } else if (specialist.availability_status === "busy") {
        score += 3;
      }

      score += Number(specialist.rating || 0) * 6;
      score += Math.min(Number(specialist.experience_years || 0), 12);
      score += Math.min(Number(specialist.projects_completed || 0), 50) / 5;

      const candidate = {
        specialist,
        score: Math.round(score * 10) / 10,
        reasons: reasons.length ? reasons : [t("ai.reason.rating")]
      };
      if (!best || candidate.score > best.score) best = candidate;
    });

    return best;
  };

  const collectFormData = form => {
    const getChecked = name =>
      [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(item => item.value);

    return {
      company: form.company?.value.trim() || "",
      email: form.email?.value.trim() || "",
      phone: form.phone?.value.trim() || "",
      title: form.title?.value.trim() || "",
      service: form.service?.value || "",
      priority: form.priority?.value || "normal",
      companySize: form.companySize?.value || "small",
      contactMethod: form.contactMethod?.value || "email",
      description: form.description?.value.trim() || "",
      outcome: form.outcome?.value.trim() || "",
      currentProcess: form.currentProcess?.value.trim() || "",
      budget: form.budget?.value.trim() || "",
      deadline: form.deadline?.value.trim() || "",
      tags: getChecked("tags"),
      stack: getChecked("stack"),
      team: {
        junior: safeNumber(form.juniorCount?.value, 0, 0, 12),
        middle: safeNumber(form.middleCount?.value, 1, 0, 12),
        senior: safeNumber(form.seniorCount?.value, 1, 0, 12)
      },
      durationMonths: safeNumber(form.durationMonths?.value, 3, 1, 36),
      collaborationModel: form.collaborationModel?.value || "outstaffing",
      stages: form.stages?.value.trim() || "",
      notes: form.notes?.value.trim() || "",
      files: [...(form.files?.files || [])].map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }))
    };
  };

  const detectService = data => {
    if (allowedServices.includes(data.service)) return data.service;

    const text = `${data.title} ${data.description} ${data.notes}`.toLowerCase();
    let detected = "hr";
    let bestScore = 0;

    Object.entries(serviceKeywords).forEach(([service, words]) => {
      const score = words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        detected = service;
      }
    });

    return detected;
  };

  const makeSummary = data => {
    const description = data.description || data.notes || data.title;
    const sentences = description.match(/[^.!?]+[.!?]?/g) || [];
    const outcome = data.outcome ? `${t("smart.analysis.outcome")}: ${data.outcome}. ` : "";
    const summary = `${outcome}${(sentences.slice(0, 2).join(" ") || t("smart.analysis.empty")).trim()}`;
    return summary.length > 260 ? `${summary.slice(0, 257)}...` : summary;
  };

  const inferTasks = data => {
    const textItems = splitItems(`${data.description}\n${data.stages}\n${data.notes}`);
    const verbs = terms("search.task.verbs");
    const direct = textItems.filter(item => verbs.some(verb => item.toLowerCase().includes(verb))).slice(0, 6);

    if (direct.length >= 3) return unique(direct);

    const service = detectService(data);
    const safeService = allowedServices.includes(service) ? service : "hr";
    return [1, 2, 3, 4].map(index => t(`task.${safeService}.${index}`));
  };

  const inferStages = data => {
    const manual = splitItems(data.stages);
    if (manual.length) return unique(manual).slice(0, 6);

    return [1, 2, 3, 4, 5].map(index => t(`stage.${index}`));
  };

  const inferRequirements = data => {
    const items = [];
    if (data.companySize) items.push(t("smart.requirements.companySize", { size: companySizeLabel(data.companySize) }));
    if (data.contactMethod) items.push(t("smart.requirements.contact", { method: contactMethodLabel(data.contactMethod) }));
    if (data.outcome) items.push(t("smart.requirements.outcome", { outcome: data.outcome }));
    if (data.currentProcess) items.push(t("smart.requirements.process"));
    if (data.budget) items.push(`${t("smart.analysis.budget")}: ${data.budget}`);
    if (data.deadline) items.push(`${t("smart.analysis.deadline")}: ${data.deadline}`);
    if (data.tags.length) items.push(...data.tags.map(tagLabel));
    if (data.files.length) items.push(t("smart.files.count", { count: data.files.length }));
    if (data.stack.length) {
      items.push(t("smart.format.label", { stack: data.stack.map(stackLabel).join(", ") }));
    }
    if (data.team) {
      items.push(t("smart.requirements.team", {
        junior: data.team.junior || 0,
        middle: data.team.middle || 0,
        senior: data.team.senior || 0
      }));
    }
    if (data.durationMonths) {
      items.push(t("smart.requirements.duration", {
        duration: t("smart.duration.short", { count: data.durationMonths })
      }));
    }
    if (data.collaborationModel) {
      items.push(t("smart.requirements.model", {
        model: modelLabel(data.collaborationModel)
      }));
    }
    return unique(items).slice(0, 8);
  };

  const normalizeTeam = (service, team = {}) => {
    const defaults = costProfiles[service]?.defaultTeam || costProfiles.hr.defaultTeam;
    const normalized = {
      junior: safeNumber(team.junior, defaults.junior, 0, 12),
      middle: safeNumber(team.middle, defaults.middle, 0, 12),
      senior: safeNumber(team.senior, defaults.senior, 0, 12)
    };

    if (normalized.junior + normalized.middle + normalized.senior === 0) {
      return { ...defaults };
    }

    return normalized;
  };

  const calculateEngagement = data => {
    const service = detectService(data);
    const profile = costProfiles[service] || costProfiles.hr;
    const team = normalizeTeam(service, data.team);
    const durationMonths = safeNumber(data.durationMonths, 3, 1, 36);
    const collaborationModel = modelMultipliers[data.collaborationModel] ? data.collaborationModel : "outstaffing";
    const headcount = team.junior + team.middle + team.senior;
    const stackFactor = 1 + Math.min(data.stack.length, 6) * 0.015;
    const monthlyOutsource = Object.entries(team).reduce(
      (sum, [level, count]) => sum + profile.monthlyRates[level] * count,
      0
    );
    const outsourcingBase = monthlyOutsource * durationMonths * modelMultipliers[collaborationModel] * stackFactor;
    const outsourcingMin = Math.round(outsourcingBase * 0.9);
    const outsourcingMax = Math.round(outsourcingBase * 1.14);
    const outsourcingAvg = Math.round((outsourcingMin + outsourcingMax) / 2);

    const monthlyStaffSalary = Object.entries(team).reduce(
      (sum, [level, count]) => sum + profile.staffSalary[level] * count,
      0
    );
    const salaryTotal = monthlyStaffSalary * durationMonths;
    const payrollTaxes = salaryTotal * 0.215;
    const workplaces = 85000 * headcount * durationMonths;
    const hiring = 240000 * headcount;
    const hrAdmin = 55000 * headcount * durationMonths;
    const paidIdleRisk = salaryTotal * 0.08;
    const staffTotal = Math.round(salaryTotal + payrollTaxes + workplaces + hiring + hrAdmin + paidIdleRisk);
    const savings = Math.max(staffTotal - outsourcingAvg, 0);
    const savingsPercent = staffTotal ? Math.round((savings / staffTotal) * 100) : 0;
    const plannedHours = headcount * durationMonths * (collaborationModel === "fixed" ? 132 : 150);

    return {
      service,
      serviceLabel: serviceLabel(service),
      team,
      headcount,
      durationMonths,
      collaborationModel,
      modelLabel: modelLabel(collaborationModel),
      outsourcingMin,
      outsourcingMax,
      outsourcingAvg,
      outsourcingLabel: `${moneyLabel(outsourcingMin)}–${moneyLabel(outsourcingMax)}`,
      staffTotal,
      staffLabel: moneyLabel(staffTotal),
      savings,
      savingsLabel: moneyLabel(savings),
      savingsPercent,
      plannedHours,
      assumptions: [
        t("smart.assumption.taxes"),
        t("smart.assumption.workplace"),
        t("smart.assumption.hiring"),
        t("smart.assumption.admin")
      ]
    };
  };

  const estimateCost = data => {
    const calculation = calculateEngagement(data);
    if (calculation.headcount > 0) {
      return {
        label: calculation.outsourcingLabel,
        note: t("smart.savings.note", {
          savings: calculation.savingsLabel,
          percent: calculation.savingsPercent
        }),
        calculation
      };
    }

    const service = detectService(data);
    const ranges = {
      hr: [120000, 420000],
      it: [350000, 1800000],
      accounting: [90000, 380000],
      legal: [80000, 520000]
    };
    const [baseMin, baseMax] = ranges[service] || [100000, 450000];
    const text = `${data.title} ${data.description} ${data.notes}`.toLowerCase();
    let multiplier = 1;

    if (data.priority === "urgent") multiplier += 0.25;
    if (data.tags.includes("longTerm")) multiplier += 0.2;
    if (data.tags.includes("fullService")) multiplier += 0.25;
    if (data.description.length > 700) multiplier += 0.15;
    if (hasAny(text, "search.complexity")) multiplier += 0.2;

    return {
      label: `${formatMoney(baseMin * multiplier)}–${formatMoney(baseMax * multiplier)} ₸`,
      note: data.budget ? t("smart.estimate.withBudget") : t("smart.estimate.afterCall"),
      calculation
    };
  };

  const inferRisks = data => {
    const text = `${data.description} ${data.notes}`.toLowerCase();
    const risks = [];

    if (data.priority === "urgent") risks.push(t("risk.urgent"));
    if (!data.budget || hasAny(data.budget.toLowerCase(), "search.unsure")) risks.push(t("risk.budget"));
    if (!data.deadline || hasAny(data.deadline.toLowerCase(), "search.unsure")) risks.push(t("risk.deadline"));
    if (text.length > 800) risks.push(t("risk.longBrief"));
    if (hasAny(text, "search.materials")) risks.push(t("risk.materials"));

    return unique(risks).slice(0, 4);
  };

  const analyze = data => {
    const service = detectService(data);
    const tasks = inferTasks(data);
    const stages = inferStages(data);
    const estimate = estimateCost(data);

    return {
      service,
      serviceLabel: serviceLabel(service),
      summary: makeSummary(data),
      estimate,
      calculation: estimate.calculation,
      tasks,
      stages,
      requirements: inferRequirements(data),
      risks: inferRisks(data),
      complexity: tasks.length > 5 || data.priority === "urgent" || estimate.calculation.headcount >= 4 ? t("smart.complexity.high") : t("smart.complexity.medium"),
      stack: data.stack.length ? data.stack.map(stackLabel) : []
    };
  };

  const hasMeaningfulRequestData = data =>
    Boolean(data.service && (data.description.length >= 10 || data.title.length >= 3 || data.outcome.length >= 5));

  const hasBriefRequestData = data =>
    Boolean(data.service || data.title || data.description || data.outcome);

  const briefDescription = data => {
    const source = data.description || data.title || "";
    const sentences = source.match(/[^.!?]+[.!?]?/g) || [];
    return (sentences.slice(0, 2).join(" ") || t("smart.analysis.formPlaceholder")).trim();
  };

  const renderAnalysisEmpty = target => {
    target.innerHTML = `
      <div class="analysis-summary">
        <span>${t("smart.analysis.emptyTitle")}</span>
        <p>${t("smart.analysis.emptyLead")}</p>
      </div>
      <div class="analysis-empty-steps">
        <span>${t("smart.empty.step.service")}</span>
        <span>${t("smart.empty.step.task")}</span>
        <span>${t("smart.empty.step.result")}</span>
      </div>
    `;
  };

  const renderAnalysisBrief = (target, data) => {
    const service = data.service ? serviceLabel(data.service) : t("smart.unspecified");
    const profile = data.service ? t(`smart.analysis.profile.${data.service}`) : t("smart.unspecified");
    target.innerHTML = `
      <div class="analysis-summary">
        <span>${escapeHtml(service)}</span>
        <p>${escapeHtml(briefDescription(data))}</p>
      </div>
      <div class="analysis-meta analysis-meta--brief">
        <div><strong>${escapeHtml(service)}</strong><span>${t("smart.analysis.selectedService")}</span></div>
        <div><strong>${escapeHtml(profile)}</strong><span>${t("smart.analysis.profile")}</span></div>
        <div><strong>${escapeHtml(data.outcome || t("smart.unspecified"))}</strong><span>${t("smart.analysis.outcome")}</span></div>
      </div>
      <div class="analysis-estimate">
        <strong>${t("smart.analysis.nextTitle")}</strong>
        <p>${t("smart.analysis.nextLead")}</p>
      </div>
    `;
  };

  const renderAnalysis = (target, analysis, data) => {
    const calculation = analysis.calculation || calculateEngagement(data);
    const teamLine = `${t("smart.capacity.junior")} ${calculation.team.junior} · ${t("smart.capacity.middle")} ${calculation.team.middle} · ${t("smart.capacity.senior")} ${calculation.team.senior}`;
    const recommendation = recommendSpecialist(data);
    target.innerHTML = `
      <div class="analysis-summary">
        <span>${escapeHtml(analysis.serviceLabel)}</span>
        <p>${escapeHtml(analysis.summary)}</p>
      </div>
      <div class="analysis-meta">
        <div><strong>${escapeHtml(data.deadline || t("smart.unspecified"))}</strong><span>${t("smart.analysis.deadline")}</span></div>
        <div><strong>${escapeHtml(data.budget || t("smart.unspecified"))}</strong><span>${t("smart.analysis.budget")}</span></div>
        <div><strong>${escapeHtml(data.outcome || t("smart.unspecified"))}</strong><span>${t("smart.analysis.outcome")}</span></div>
        <div><strong>${escapeHtml(analysis.estimate.label)}</strong><span>${t("smart.analysis.estimate")}</span></div>
        <div><strong>${escapeHtml(analysis.complexity)}</strong><span>${t("smart.analysis.complexity")}</span></div>
      </div>
      <div class="cost-comparison">
        <div class="cost-card is-accent">
          <span>${t("smart.compare.outsourcing")}</span>
          <strong>${escapeHtml(calculation.outsourcingLabel)}</strong>
          <small>${escapeHtml(calculation.modelLabel)} · ${escapeHtml(teamLine)}</small>
        </div>
        <div class="cost-card">
          <span>${t("smart.compare.staff")}</span>
          <strong>${escapeHtml(calculation.staffLabel)}</strong>
          <small>${t("smart.compare.duration", {
            duration: t("smart.duration.short", { count: calculation.durationMonths })
          })}</small>
        </div>
        <div class="cost-card is-success">
          <span>${t("smart.compare.savings")}</span>
          <strong>${escapeHtml(calculation.savingsLabel)}</strong>
          <small>${t("smart.compare.savingsDetail", {
            percent: calculation.savingsPercent,
            hours: calculation.plannedHours
          })}</small>
        </div>
      </div>
      <div class="analysis-estimate">
        <strong>${t("smart.compare.summary")}</strong>
        <p>${escapeHtml(analysis.estimate.note)}</p>
      </div>
      ${recommendation ? `
        <div class="recommended-specialist">
          <img src="${escapeHtml(recommendation.specialist.photo || "../img/logo.png")}" alt="" />
          <div>
            <span>${t("ai.recommended")}</span>
            <strong>${escapeHtml(recommendation.specialist.name)}</strong>
            <small>${escapeHtml(recommendation.specialist.specialization)} · ${t("specialists.rating")} ${escapeHtml(recommendation.specialist.rating)} · ${t("ai.score")} ${escapeHtml(recommendation.score)}</small>
            <div class="badge-list muted">${recommendation.reasons.map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div>
          </div>
        </div>
      ` : ""}
      <div class="analysis-block">
        <h4>${t("smart.compare.assumptions")}</h4>
        <div class="badge-list muted">${calculation.assumptions.map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div>
      </div>
      <div class="analysis-block">
        <h4>${t("smart.analysis.tasks")}</h4>
        <div class="badge-list">${analysis.tasks.map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div>
      </div>
      <div class="analysis-block">
        <h4>${t("smart.analysis.stages")}</h4>
        <div class="mini-timeline">${analysis.stages.map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div>
      </div>
      ${analysis.requirements.length ? `
        <div class="analysis-block">
          <h4>${t("smart.analysis.requirements")}</h4>
          <div class="badge-list muted">${analysis.requirements.map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div>
        </div>` : ""}
      ${analysis.risks.length ? `
        <div class="analysis-block">
          <h4>${t("smart.analysis.risks")}</h4>
          <ul>${analysis.risks.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>` : ""}
    `;
  };

  const createTasks = (analysis, data) => {
    const today = new Date();
    const plannedHours = analysis.calculation?.plannedHours || 120;
    const hoursPerTask = Math.max(8, Math.round(plannedHours / Math.max(analysis.tasks.length, 1)));
    return analysis.tasks.map((title, index) => {
      const start = new Date(today);
      start.setDate(today.getDate() + index * 4);
      const deadline = new Date(start);
      deadline.setDate(start.getDate() + 4);

      return {
        id: `task-${Date.now()}-${index}`,
        title,
        status: index === 0 ? "in_progress" : index === 1 ? "review" : "new",
        stage: analysis.stages[Math.min(index, analysis.stages.length - 1)] || t("smart.step.plan"),
        sprint: t("tracker.sprintNumber", { number: Math.floor(index / 2) + 1 }),
        startDate: start.toISOString().slice(0, 10),
        deadline: deadline.toISOString().slice(0, 10),
        hoursPlanned: hoursPerTask,
        hoursSpent: index === 0 ? Math.round(hoursPerTask * 0.45) : index === 1 ? Math.round(hoursPerTask * 0.72) : 0,
        comment: index === 0 ? t("smart.projectCreated") : "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
  };

  const createSprints = tasks => {
    const groups = [...new Set(tasks.map(task => task.sprint || t("tracker.sprintNumber", { number: 1 })))];
    return groups.map((name, index) => {
      const sprintTasks = tasks.filter(task => (task.sprint || t("tracker.sprintNumber", { number: 1 })) === name);
      return {
        id: `sprint-${Date.now()}-${index}`,
        name,
        goal: sprintTasks[0]?.stage || t("tracker.sprint.goal"),
        startDate: sprintTasks[0]?.startDate || new Date().toISOString().slice(0, 10),
        endDate: sprintTasks[sprintTasks.length - 1]?.deadline || sprintTasks[0]?.deadline || "",
        plannedHours: sprintTasks.reduce((sum, task) => sum + (task.hoursPlanned || 0), 0),
        spentHours: sprintTasks.reduce((sum, task) => sum + (task.hoursSpent || 0), 0)
      };
    });
  };

  const projectIdentity = project =>
    project?.requestId ||
    `${project?.data?.title || ""}|${project?.data?.company || ""}|${project?.data?.service || ""}|${project?.createdAt || ""}`;

  const chooseProjectVersion = (current, candidate) => {
    if (!current) return candidate;
    if (current.demo && !candidate.demo) return candidate;
    if (String(current.id || "").startsWith("project-") && !String(candidate.id || "").startsWith("project-")) return candidate;
    if (!current.backendSyncedAt && candidate.backendSyncedAt) return candidate;
    return current;
  };

  const dedupeProjects = projects => {
    const byIdentity = new Map();
    projects.filter(Boolean).forEach(project => {
      const key = projectIdentity(project) || project.id;
      byIdentity.set(key, chooseProjectVersion(byIdentity.get(key), project));
    });
    return [...byIdentity.values()];
  };

  const saveProject = project => {
    const projects = readJson(PROJECTS_KEY, []).filter(item =>
      item.id !== project.id &&
      !(project.requestId && item.requestId === project.requestId)
    );
    const next = dedupeProjects([project, ...projects]).slice(0, 20);
    writeJson(PROJECTS_KEY, next);
    storage.setItem(ACTIVE_KEY, project.id);
  };

  const updateProject = project => {
    const projects = readJson(PROJECTS_KEY, []);
    writeJson(PROJECTS_KEY, projects.map(item => item.id === project.id ? project : item));
    syncProject(project);
  };

  const projectApiPayload = project => ({
    request_id: project.requestId || "",
    title: project.data.title || t("tracker.title"),
    company: project.data.company || "",
    email: project.data.email || "",
    service: project.data.service || "",
    status: project.tasks?.every(task => task.status === "done") ? "done" : "in_progress",
    payload: project
  });

  const createBackendProject = async project => {
    const saved = await api("/projects", {
      method: "POST",
      body: JSON.stringify(projectApiPayload(project))
    });

    const backendProject = {
      ...saved.payload,
      id: saved.id,
      requestId: saved.request_id || project.requestId || "",
      backendSyncedAt: saved.updated_at
    };

    const projects = readJson(PROJECTS_KEY, []).filter(item =>
      item.id !== project.id &&
      item.id !== saved.id &&
      !(project.requestId && item.requestId === project.requestId)
    );
    writeJson(PROJECTS_KEY, projects);
    saveProject(backendProject);
    return backendProject;
  };

  const syncProject = async project => {
    if (!project?.id || project.id.startsWith("project-")) return;

    try {
      await api(`/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        body: JSON.stringify(projectApiPayload(project))
      });
    } catch (_) {}
  };

  const normalizeBackendProject = item => {
    if (!item?.payload) return null;
    return {
      ...item.payload,
      id: item.id,
      requestId: item.request_id || item.payload.requestId || "",
      backendSyncedAt: item.updated_at
    };
  };

  const initRequestForm = () => {
    const form = document.getElementById("smart-request-form");
    const preview = document.getElementById("analysis-preview");
    if (!form || !preview) return;

    const progressFill = document.getElementById("request-progress-fill");
    const progressLabel = document.getElementById("request-progress-label");
    const progressStep = document.getElementById("request-progress-step");
    const draftState = document.getElementById("draft-state");
    const techSection = document.getElementById("tech-section");
    const stackOptions = document.getElementById("stack-options");
    const fileList = document.getElementById("file-list");
    const success = document.getElementById("rq-success");
    const servicePicker = document.getElementById("service-picker");
    const statusCard = document.getElementById("request-status-card");
    const phonePattern = /^[+()\d\s/-]{7,24}$/;

    const showError = (id, text) => {
      const error = form.querySelector(`.form-error[data-for="${id}"]`);
      if (error) {
        error.textContent = text;
        error.classList.add("visible");
      }
    };

    const clearErrors = () => {
      form.querySelectorAll(".form-error").forEach(error => {
        error.classList.remove("visible");
        error.textContent = "";
      });
    };

    const syncServicePicker = service => {
      servicePicker?.querySelectorAll(".service-choice").forEach(button => {
        const active = button.dataset.service === service;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    };

    const renderRequestStatus = (state = "draft") => {
      if (!statusCard) return;
      const activeMap = { draft: 0, ready: 0, submitted: 4, local: 1 };
      const activeIndex = activeMap[state] ?? 0;
      statusCard.dataset.state = state;
      statusCard.querySelectorAll(".request-status-steps span").forEach((step, index) => {
        step.classList.toggle("is-active", index === activeIndex);
        step.classList.toggle("is-done", index < activeIndex);
      });
    };

    const updateStackOptions = data => {
      if (!stackOptions) return;
      const service = data.service || "";
      const lang = window.I18N?.current || "ru";
      if (stackOptions.dataset.service === service && stackOptions.dataset.lang === lang) return;

      const selected = new Set(data.stack || []);
      stackOptions.dataset.service = service;
      stackOptions.dataset.lang = lang;
      if (!service) {
        stackOptions.innerHTML = `<div class="empty-state">${t("smart.scope.empty")}</div>`;
        syncServicePicker("");
        return;
      }
      stackOptions.innerHTML = (serviceStacks[service] || serviceStacks.hr).map(item => `
        <label>
          <input type="checkbox" name="stack" value="${escapeHtml(item)}" ${selected.has(item) ? "checked" : ""} />
          <span>${escapeHtml(stackLabel(item))}</span>
        </label>
      `).join("");
      syncServicePicker(service);
    };

    const applyDraft = () => {
      const draft = readJson(DRAFT_KEY, null);
      if (!draft) return;
      if (draft.service && form.service) form.service.value = draft.service;
      updateStackOptions({
        ...draft,
        service: draft.service || form.service?.value || "",
        stack: draft.stack || []
      });

      Object.entries(draft).forEach(([key, value]) => {
        if (key === "tags" || key === "stack") {
          value.forEach(item => {
            const input = form.querySelector(`input[name="${key}"][value="${CSS.escape(item)}"]`);
            if (input) input.checked = true;
          });
          return;
        }

        if (key === "team" && value && typeof value === "object") {
          if (form.juniorCount) form.juniorCount.value = value.junior ?? 0;
          if (form.middleCount) form.middleCount.value = value.middle ?? 1;
          if (form.seniorCount) form.seniorCount.value = value.senior ?? 1;
          return;
        }

        if (form[key] && (typeof value === "string" || typeof value === "number")) form[key].value = value;
      });
    };

    const updateFileList = () => {
      const files = [...(form.files?.files || [])];
      fileList.textContent = files.length
        ? files.map(file => file.name).join(", ")
        : t("smart.files.empty");
    };

    const updateTechVisibility = () => {
      techSection.hidden = false;
    };

    const updateProgress = data => {
      const checks = [
        data.company,
        data.email,
        data.title,
        data.service,
        data.description,
        data.outcome,
        data.currentProcess,
        data.budget,
        data.deadline,
        data.tags.length,
        data.stages || data.notes,
        data.stack.length
      ];
      const completed = checks.filter(Boolean).length;
      const percent = Math.round((completed / checks.length) * 100);
      const sections = [...form.querySelectorAll(".smart-section:not([hidden])")];
      const active = sections.find(section => section.querySelector("input:focus, textarea:focus, select:focus")) || sections[0];

      progressFill.style.width = `${percent}%`;
      progressLabel.textContent = t("smart.progress.label", { percent });
      progressStep.textContent = active?.dataset.sectionNameKey ? t(active.dataset.sectionNameKey) : t("smart.step.basic");
      sections.forEach(section => section.classList.toggle("is-active", section === active));
      renderRequestStatus(percent >= 70 ? "ready" : "draft");
    };

    let saveTimer = null;
    const refresh = () => {
      const data = collectFormData(form);
      updateStackOptions(data);
      updateFileList();
      updateTechVisibility(data);
      updateProgress(data);
      if (hasMeaningfulRequestData(data)) {
        renderAnalysis(preview, analyze(data), data);
      } else if (hasBriefRequestData(data)) {
        renderAnalysisBrief(preview, data);
      } else {
        renderAnalysisEmpty(preview);
      }
      syncServicePicker(data.service || "");

      clearTimeout(saveTimer);
      draftState.textContent = t("smart.draft.saving");
      saveTimer = setTimeout(() => {
        writeJson(DRAFT_KEY, data);
        draftState.textContent = `${t("smart.draft.saved")} ${new Date().toLocaleTimeString(window.I18N?.current || "ru", { hour: "2-digit", minute: "2-digit" })}`;
      }, 350);
    };

    if (new URLSearchParams(window.location.search).get("draft") === "1") {
      applyDraft();
    } else {
      storage.removeItem(DRAFT_KEY);
    }
    refresh();
    loadSpecialists().then(refresh);

    form.addEventListener("input", refresh);
    form.addEventListener("change", refresh);
    form.addEventListener("focusin", refresh);
    servicePicker?.addEventListener("click", event => {
      const button = event.target.closest(".service-choice");
      if (!button || !form.service) return;
      form.service.value = button.dataset.service || "";
      updateStackOptions({
        ...collectFormData(form),
        service: form.service.value,
        stack: []
      });
      refresh();
    });
    document.getElementById("lang-select")?.addEventListener("change", () => {
      setTimeout(refresh, 0);
    });

    document.getElementById("clear-draft")?.addEventListener("click", () => {
      storage.removeItem(DRAFT_KEY);
      form.reset();
      refresh();
      window.AX?.toast(t("smart.clear.toast"), "success");
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      clearErrors();
      if (success) success.classList.remove("visible");

      const data = collectFormData(form);
      let valid = true;

      if (data.company.length < 2) {
        showError("rq-company", t("smart.err.company"));
        valid = false;
      }
      if (!window.AX?.validateEmail(data.email)) {
        showError("rq-email", t("smart.err.email"));
        valid = false;
      }
      if (data.phone && !phonePattern.test(data.phone)) {
        showError("rq-phone", t("smart.err.phone"));
        valid = false;
      }
      if (data.title.length < 3) {
        showError("rq-title", t("smart.err.title"));
        valid = false;
      }
      if (!data.service) {
        showError("rq-service", t("smart.err.service"));
        valid = false;
      }
      if (data.description.length < 30) {
        showError("rq-description", t("smart.err.description"));
        valid = false;
      }
      if (data.outcome.length < 5) {
        showError("rq-outcome", t("smart.err.outcome"));
        valid = false;
      }
      if (!valid) return;

      const analysis = analyze(data);
      const tasks = createTasks(analysis, data);
      const project = {
        id: `project-${Date.now()}`,
        requestId: "",
        data,
        analysis,
        tasks,
        sprints: createSprints(tasks),
        activity: [{
          text: t("smart.projectCreated"),
          at: new Date().toISOString()
        }],
        createdAt: new Date().toISOString()
      };

      let nextProject = project;
      let savedLocally = false;
      saveProject(nextProject);
      storage.removeItem(DRAFT_KEY);

      try {
        const request = await api("/requests", {
          method: "POST",
          body: JSON.stringify({
            company: data.company,
            email: data.email,
            phone: data.phone,
            title: data.title,
            service: data.service,
            message: data.description,
            priority: data.priority,
            budget: data.budget,
            deadline: data.deadline,
            tags: data.tags,
            details: {
              companySize: data.companySize,
              contactMethod: data.contactMethod,
              outcome: data.outcome,
              currentProcess: data.currentProcess,
              stack: data.stack,
              team: data.team,
              durationMonths: data.durationMonths,
              collaborationModel: data.collaborationModel,
              calculation: analysis.calculation
            },
            summary: analysis.summary,
            estimate: analysis.estimate.label,
            complexity: analysis.complexity
          })
        });
        nextProject.requestId = request.id;
        nextProject.data.recommendedSpecialist = request.recommended_specialist || request.details?.recommendedSpecialist || null;
        nextProject.analysis.recommendedSpecialist = nextProject.data.recommendedSpecialist;
        saveProject(nextProject);
        nextProject = await createBackendProject(nextProject);
      } catch (_) {
        savedLocally = true;
        nextProject.activity.unshift({
          text: t("smart.localOnly"),
          at: new Date().toISOString()
        });
        updateProject(nextProject);
        renderRequestStatus("local");
      }

      if (success) success.classList.add("visible");
      renderRequestStatus(savedLocally ? "local" : "submitted");
      window.AX?.toast(t("smart.created.toast"), "success");
      setTimeout(() => {
        window.location.href = window.AX?.isAuthenticated()
          ? `project-tracker.html?id=${encodeURIComponent(nextProject.id)}`
          : "login.html";
      }, 1100);
    });
  };

  const getActiveProject = async () => {
    const projects = readJson(PROJECTS_KEY, []);
    const id = new URLSearchParams(window.location.search).get("id") || storage.getItem(ACTIVE_KEY);
    const local = projects.find(item => item.id === id) || projects[0] || null;

    if (id) {
      try {
        const remote = normalizeBackendProject(await api(`/projects/${encodeURIComponent(id)}`));
        if (remote) {
          saveProject(remote);
          return remote;
        }
      } catch (_) {}
    }

    return local;
  };

  const taskProgress = tasks => {
    if (!tasks.length) return 0;
    const weights = { new: 0, in_progress: 35, review: 70, done: 100, cancelled: 0 };
    return Math.round(tasks.reduce((sum, task) => sum + weights[task.status], 0) / tasks.length);
  };

  const ensureProjectMetrics = project => {
    if (!project) return project;
    const now = new Date();
    project.tasks = (project.tasks || []).map((task, index) => {
      const startDate = task.startDate || (() => {
        const date = new Date(project.createdAt || now);
        date.setDate(date.getDate() + index * 4);
        return date.toISOString().slice(0, 10);
      })();
      const deadline = task.deadline || (() => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + 4);
        return date.toISOString().slice(0, 10);
      })();
      const hoursPlanned = safeNumber(task.hoursPlanned, Math.max(8, Math.round((project.analysis?.calculation?.plannedHours || 120) / Math.max(project.tasks.length, 1))), 1, 1200);
      const statusRatio = { new: 0, in_progress: 0.42, review: 0.78, done: 1, cancelled: 0 }[task.status] ?? 0;

      return {
        ...task,
        sprint: task.sprint || t("tracker.sprintNumber", { number: Math.floor(index / 2) + 1 }),
        startDate,
        deadline,
        hoursPlanned,
        hoursSpent: safeNumber(task.hoursSpent, Math.round(hoursPlanned * statusRatio), 0, 1200)
      };
    });

    project.sprints = createSprints(project.tasks);
    return project;
  };

  const formatShortDate = value => {
    if (!value) return "";
    return new Date(value).toLocaleDateString(window.I18N?.current || "ru", { day: "2-digit", month: "short" });
  };

  const projectStatus = project => {
    if (project?.demo) return "demo";
    const tasks = project?.tasks || [];
    if (tasks.length && tasks.every(task => task.status === "done")) return "done";
    if (tasks.some(task => task.status === "review")) return "review";
    return "active";
  };

  const projectStatusLabel = project => t(`projects.status.${projectStatus(project)}`);

  const renderProjectDashboard = activeProject => {
    const cards = document.getElementById("project-cards");
    const kpis = document.getElementById("project-kpis");
    const search = document.getElementById("project-search");
    const serviceFilter = document.getElementById("project-service-filter");
    const statusFilter = document.getElementById("project-status-filter");
    if (!cards || !kpis) return;

    const localProjects = dedupeProjects(readJson(PROJECTS_KEY, []).map(project => ensureProjectMetrics(project)));
    const allProjects = unique(localProjects.map(project => project?.id))
      .map(id => localProjects.find(project => project.id === id))
      .filter(project => project && !project.demo);

    if (allProjects.length !== readJson(PROJECTS_KEY, []).length) {
      writeJson(PROJECTS_KEY, allProjects);
    }

    window.__axesPortfolioProjects = allProjects;

    const plannedHours = allProjects.reduce((sum, project) =>
      sum + (project.tasks || []).reduce((taskSum, task) => taskSum + (task.hoursPlanned || 0), 0), 0);
    const savings = allProjects.reduce((sum, project) => sum + (project.analysis?.calculation?.savings || 0), 0);
    const reviewCount = allProjects.filter(project => projectStatus(project) === "review").length;
    const activeCount = allProjects.filter(project => ["active", "demo"].includes(projectStatus(project))).length;

    kpis.innerHTML = `
      <article><strong>${activeCount}</strong><span>${t("projects.kpi.active")}</span></article>
      <article><strong>${reviewCount}</strong><span>${t("projects.kpi.review")}</span></article>
      <article><strong>${plannedHours}</strong><span>${t("projects.kpi.hours")}</span></article>
      <article><strong>${moneyLabel(savings)}</strong><span>${t("projects.kpi.savings")}</span></article>
    `;

    const renderCards = () => {
      const query = (search?.value || "").toLowerCase();
      const service = serviceFilter?.value || "all";
      const status = statusFilter?.value || "all";
      const filtered = allProjects.filter(project => {
        const haystack = `${project.data?.title || ""} ${project.data?.company || ""} ${project.analysis?.summary || ""} ${(project.tags || []).join(" ")}`.toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const matchesService = service === "all" || project.data?.service === service;
        const currentStatus = projectStatus(project);
        const matchesStatus = status === "all" || currentStatus === status;
        return matchesQuery && matchesService && matchesStatus;
      });

      cards.innerHTML = filtered.length ? filtered.map(project => {
        const progress = taskProgress(project.tasks || []);
        const current = activeProject?.id === project.id;
        const tags = project.tags?.length ? project.tags : (project.data?.stack || []).slice(0, 3).map(stackLabel);
        return `
          <article class="project-card ${current ? "is-current" : ""}">
            <header>
              <span class="project-card__type">${project.demo ? t("projects.demo") : t("projects.real")}</span>
              <strong class="task-status-badge is-${projectStatus(project)}">${projectStatusLabel(project)}</strong>
            </header>
            <h3>${escapeHtml(project.data?.title || t("tracker.title"))}</h3>
            <p>${escapeHtml(project.analysis?.summary || t("tracker.lead"))}</p>
            <div class="project-card__meta">
              <div><span>${t("admin.table.company")}</span><strong>${escapeHtml(project.data?.company || t("smart.unspecified"))}</strong></div>
              <div><span>${t("admin.table.service")}</span><strong>${escapeHtml(serviceLabel(project.data?.service))}</strong></div>
              <div><span>${t("projects.tasks")}</span><strong>${(project.tasks || []).length}</strong></div>
            </div>
            <div class="project-card__progress">
              <span><b>${t("projects.progress")}</b><strong>${progress}%</strong></span>
              <div class="tracker-progress"><span style="width:${progress}%"></span></div>
            </div>
            <div class="admin-chip-list">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
            <footer>
              <span>${escapeHtml(project.analysis?.estimate?.label || "")}</span>
              <a class="btn btn-sm btn-primary" href="project-tracker.html?id=${encodeURIComponent(project.id)}" data-project-open="${escapeHtml(project.id)}">${t("projects.open")}</a>
            </footer>
          </article>
        `;
      }).join("") : `<div class="empty-state">${t("projects.empty")}</div>`;
    };

    if (!cards.dataset.bound) {
      cards.dataset.bound = "true";
      cards.addEventListener("click", event => {
        const link = event.target.closest("[data-project-open]");
        if (!link) return;
        const project = window.__axesPortfolioProjects?.find(item => item.id === link.dataset.projectOpen);
        if (project?.demo) saveProject(project);
      });
      [search, serviceFilter, statusFilter].forEach(item => item?.addEventListener("input", renderCards));
      [serviceFilter, statusFilter].forEach(item => item?.addEventListener("change", renderCards));
      document.getElementById("lang-select")?.addEventListener("change", () => setTimeout(() => renderProjectDashboard(activeProject), 0));
    }

    renderCards();
  };

  const datePercent = (start, end, current) => {
    const min = new Date(start).getTime();
    const max = new Date(end).getTime();
    const cur = new Date(current).getTime();
    if (!min || !max || max <= min) return 0;
    return Math.max(0, Math.min(100, ((cur - min) / (max - min)) * 100));
  };

  const renderGantt = project => {
    const tasks = project.tasks || [];
    if (!tasks.length) return `<div class="empty-state">${t("tracker.gantt.empty")}</div>`;

    const starts = tasks.map(task => task.startDate || task.deadline).filter(Boolean).sort();
    const ends = tasks.map(task => task.deadline || task.startDate).filter(Boolean).sort();
    const min = starts[0] || new Date().toISOString().slice(0, 10);
    const max = ends[ends.length - 1] || min;

    return `
      <div class="gantt-chart">
        ${tasks.map(task => {
          const left = datePercent(min, max, task.startDate || min);
          const right = datePercent(min, max, task.deadline || max);
          const width = Math.max(12, right - left || 18);
          const spent = task.hoursPlanned ? Math.round((task.hoursSpent / task.hoursPlanned) * 100) : 0;
          return `
            <div class="gantt-row">
              <div class="gantt-label">
                <strong>${escapeHtml(task.title)}</strong>
                <span>${escapeHtml(task.sprint || "")} · ${formatShortDate(task.startDate)}–${formatShortDate(task.deadline)}</span>
              </div>
              <div class="gantt-track">
                <span class="gantt-bar is-${task.status}" style="left:${left}%;width:${width}%"><b style="width:${Math.min(spent, 100)}%"></b></span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  };

  const renderSprints = project => {
    const sprints = project.sprints || createSprints(project.tasks || []);
    if (!sprints.length) return `<div class="empty-state">${t("tracker.sprints.empty")}</div>`;

    return sprints.map(sprint => {
      const percent = sprint.plannedHours ? Math.round((sprint.spentHours / sprint.plannedHours) * 100) : 0;
      return `
        <div class="sprint-card">
          <div>
            <strong>${escapeHtml(sprint.name)}</strong>
            <span>${escapeHtml(sprint.goal)} · ${formatShortDate(sprint.startDate)}–${formatShortDate(sprint.endDate)}</span>
          </div>
          <div class="hours-meter"><span style="width:${Math.min(percent, 100)}%"></span></div>
          <small>${sprint.spentHours} / ${sprint.plannedHours} ${t("tracker.hours")}</small>
        </div>
      `;
    }).join("");
  };

  const renderTracker = project => {
    project = ensureProjectMetrics(project);
    renderProjectDashboard(project);
    const title = document.getElementById("tracker-title");
    const subtitle = document.getElementById("tracker-subtitle");
    const summary = document.getElementById("tracker-summary");
    const board = document.getElementById("kanban-board");
    const timeline = document.getElementById("project-timeline");
    const log = document.getElementById("activity-log");
    const sprintsBox = document.getElementById("sprint-overview");
    const ganttBox = document.getElementById("gantt-chart");
    const syncBadge = document.getElementById("tracker-sync-state");
    const search = document.getElementById("task-search");
    const filter = document.getElementById("task-filter");
    const sort = document.getElementById("task-sort");

    if (!title || !summary || !board) return;

    if (!project) {
      title.textContent = t("tracker.title");
      subtitle.textContent = t("tracker.lead");
      summary.innerHTML = `<div class="empty-state"><p>${t("tracker.empty")}</p><a class="btn btn-primary" href="requests.html">${t("smart.submit")}</a></div>`;
      board.innerHTML = "";
      if (timeline) timeline.innerHTML = "";
      if (log) log.innerHTML = "";
      if (sprintsBox) sprintsBox.innerHTML = "";
      if (ganttBox) ganttBox.innerHTML = "";
      if (syncBadge) syncBadge.textContent = t("tracker.sync.mock");
      return;
    }

    const persist = () => updateProject(project);

    const renderAll = () => {
      ensureProjectMetrics(project);
      const progress = taskProgress(project.tasks);
      project.analysis = analyze(project.data);
      project.sprints = createSprints(project.tasks);
      renderProjectDashboard(project);
      const plannedHours = project.tasks.reduce((sum, task) => sum + (task.hoursPlanned || 0), 0);
      const spentHours = project.tasks.reduce((sum, task) => sum + (task.hoursSpent || 0), 0);
      title.textContent = project.data.title || t("tracker.title");
      subtitle.textContent = `${project.analysis.serviceLabel} · ${project.data.company}`;

      summary.innerHTML = `
        <div class="summary-card wide">
          <span>${t("tracker.progress")}</span>
          <strong>${progress}%</strong>
          <div class="tracker-progress"><span style="width:${progress}%"></span></div>
        </div>
        <div class="summary-card"><span>${t("tracker.tasks")}</span><strong>${project.tasks.length}</strong></div>
        <div class="summary-card"><span>${t("tracker.summary.hours")}</span><strong>${spentHours} / ${plannedHours}</strong></div>
        <div class="summary-card"><span>${t("tracker.summary.sprints")}</span><strong>${project.sprints.length}</strong></div>
      `;
      if (syncBadge) {
        syncBadge.textContent = project.backendSyncedAt
          ? t("tracker.sync.api", {
            time: new Date(project.backendSyncedAt).toLocaleTimeString(window.I18N?.locale() || "ru-RU", { hour: "2-digit", minute: "2-digit" })
          })
          : t("tracker.sync.mock");
      }

      const query = (search?.value || "").toLowerCase();
      const activeFilter = filter?.value || "all";
      const sortMode = sort?.value || "stage";
      let tasks = project.tasks.filter(task => {
        const matchesQuery = `${task.title} ${task.comment} ${task.stage}`.toLowerCase().includes(query);
        const matchesStatus = activeFilter === "all" || task.status === activeFilter;
        return matchesQuery && matchesStatus;
      });

      tasks = tasks.sort((a, b) => {
        if (sortMode === "deadline") return (a.deadline || "").localeCompare(b.deadline || "");
        if (sortMode === "status") return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        return (a.stage || "").localeCompare(b.stage || "");
      });

      board.innerHTML = statusOrder.map(status => {
        const columnTasks = tasks.filter(task => task.status === status);
        return `
          <div class="kanban-column" data-status="${status}">
            <div class="kanban-column__head">
              <h3>${statusLabel(status)}</h3>
              <span>${columnTasks.length}</span>
            </div>
            <div class="kanban-list">
              ${columnTasks.length ? columnTasks.map(taskCard).join("") : `<div class="empty-column">${t("tracker.emptyColumn")}</div>`}
            </div>
          </div>
        `;
      }).join("");

      timeline.innerHTML = project.analysis.stages.map((stage, index) => {
        const stageTasks = project.tasks.filter(task => task.stage === stage);
        const done = stageTasks.filter(task => task.status === "done").length;
        const percent = stageTasks.length ? Math.round((done / stageTasks.length) * 100) : 0;

        return `
          <div class="timeline-item ${percent === 100 ? "is-done" : index === 0 ? "active" : ""}">
            <span>${index + 1}</span>
            <div>
              <p>${escapeHtml(stage)}</p>
              <small>${t("tracker.stageTasks", { count: stageTasks.length })} · ${percent}%</small>
              <b style="width:${percent}%"></b>
            </div>
          </div>
        `;
      }).join("");

      log.innerHTML = project.activity.slice(0, 8).map(item => `
        <div class="activity-item">
          <strong>${escapeHtml(item.text)}</strong>
          <time>${new Date(item.at).toLocaleString(window.I18N?.current || "ru", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
        </div>
      `).join("");

      if (sprintsBox) sprintsBox.innerHTML = renderSprints(project);
      if (ganttBox) ganttBox.innerHTML = renderGantt(project);
    };

    const taskCard = task => `
      <article class="task-card" data-task-id="${task.id}">
        <div class="task-card__top">
          <span>${escapeHtml(task.sprint || task.stage)}</span>
          <strong class="task-status-badge is-${task.status}">${statusLabel(task.status)}</strong>
        </div>
        <h4>${escapeHtml(task.title)}</h4>
        ${task.comment ? `<p>${escapeHtml(task.comment)}</p>` : ""}
        <div class="task-hours">
          <span style="width:${task.hoursPlanned ? Math.min(100, Math.round((task.hoursSpent / task.hoursPlanned) * 100)) : 0}%"></span>
        </div>
        <div class="task-status-actions">
          ${statusOrder.map(status => `
            <button type="button" class="${task.status === status ? "active" : ""}" data-task-status-next="${status}">
              ${statusLabel(status)}
            </button>
          `).join("")}
        </div>
        <div class="task-card__foot">
          <time>${task.startDate ? `${formatShortDate(task.startDate)}–${formatShortDate(task.deadline)}` : t("tracker.noDeadline")}</time>
          <span>${task.hoursSpent || 0}/${task.hoursPlanned || 0} ${t("tracker.hours.short")}</span>
        </div>
      </article>
    `;

    [search, filter, sort].forEach(item => item?.addEventListener("input", renderAll));
    [filter, sort].forEach(item => item?.addEventListener("change", renderAll));
    board.addEventListener("click", event => {
      const button = event.target.closest("[data-task-status-next]");
      const card = event.target.closest("[data-task-id]");
      if (!button || !card) return;

      const task = project.tasks.find(item => item.id === card.dataset.taskId);
      if (!task || task.status === button.dataset.taskStatusNext) return;

      task.status = button.dataset.taskStatusNext;
      task.updatedAt = new Date().toISOString();
      const ratio = { new: 0, in_progress: 0.42, review: 0.78, done: 1, cancelled: 0 }[task.status] ?? 0;
      task.hoursSpent = Math.round((task.hoursPlanned || 0) * ratio);
      project.activity.unshift({
        text: t("tracker.taskStatusChanged", { title: task.title, status: statusLabel(task.status) }),
        at: new Date().toISOString()
      });
      persist();
      renderAll();
    });
    document.getElementById("lang-select")?.addEventListener("change", () => {
      setTimeout(renderAll, 0);
    });

    initTaskModal(project, persist, renderAll);
    if (project.id && !project.id.startsWith("project-")) {
      window.clearInterval(window.__axesTrackerPoll);
      window.__axesTrackerPoll = window.setInterval(async () => {
        try {
          const remote = normalizeBackendProject(await api(`/projects/${encodeURIComponent(project.id)}`));
          if (!remote) return;
          project = ensureProjectMetrics(remote);
          saveProject(project);
          renderAll();
        } catch (_) {}
      }, 9000);
    }
    renderAll();
  };

  const statusPriority = priority => ({
    low: t("smart.priority.low"),
    normal: t("smart.priority.normal"),
    high: t("smart.priority.high"),
    urgent: t("smart.priority.urgent")
  }[priority] || t("smart.priority.normal"));

  const initTaskModal = (project, persist, rerender) => {
    const modal = document.getElementById("task-modal");
    const open = document.getElementById("add-task-btn");
    const close = document.getElementById("task-modal-close");
    const form = document.getElementById("task-form");
    if (!modal || !open || !form) return;

    const hide = () => modal.setAttribute("aria-hidden", "true");
    const show = () => modal.setAttribute("aria-hidden", "false");

    open.addEventListener("click", show);
    close?.addEventListener("click", hide);
    modal.addEventListener("click", event => {
      if (event.target === modal) hide();
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      const title = form.title.value.trim();
      if (!title) return;

      project.tasks.push({
        id: `task-${Date.now()}`,
        title,
        status: "new",
        stage: t("tracker.clientTasks"),
        sprint: t("tracker.sprintNumber", { number: Math.floor(project.tasks.length / 2) + 1 }),
        startDate: new Date().toISOString().slice(0, 10),
        deadline: form.deadline.value,
        hoursPlanned: 16,
        hoursSpent: 0,
        comment: form.comment.value.trim(),
        source: "client",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      project.activity.unshift({ text: t("tracker.taskAdded", { title }), at: new Date().toISOString() });
      project.sprints = createSprints(project.tasks);
      persist();
      form.reset();
      hide();
      rerender();
    });
  };

  const initSmartRequests = () => {
    initRequestForm();
    getActiveProject()
      .then(renderTracker)
      .catch(() => renderTracker(null));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSmartRequests);
  } else {
    initSmartRequests();
  }
})();
