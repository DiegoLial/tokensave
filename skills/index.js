export const SKILLS = [
  {
    id: 'security-audit',
    name: 'Security Audit',
    description: 'Revisão de segurança completa: código, dependências, surface de ataque',
    papel: 'Security Auditor',
    modos: ['revisar-codigo', 'pitfalls', 'multi-perspectiva'],
    defaultCondicao: 'Todas as vulnerabilidades críticas identificadas e mitigadas',
  },
  {
    id: 'data-science',
    name: 'Data Science',
    description: 'Pipeline de dados, análise estatística e modelagem',
    papel: 'Data Scientist',
    modos: ['metrics-mode', 'criar-sistema', 'compare'],
    defaultCondicao: 'Modelo validado e KPIs definidos',
  },
  {
    id: 'database',
    name: 'Database',
    description: 'Design de schema, queries, índices e performance',
    papel: 'DBA',
    modos: ['criar-sistema', 'revisar-codigo', 'pitfalls'],
    defaultCondicao: 'Schema otimizado e queries com plano de execução validado',
  },
  {
    id: 'software-architect',
    name: 'Software Architect',
    description: 'Decisões de arquitetura, stack, trade-offs',
    papel: 'Arquiteto de Software Sênior',
    modos: ['criar-sistema', 'compare', 'multi-perspectiva'],
    defaultCondicao: 'ADR gerado e decisões documentadas',
  },
  {
    id: 'ux-ui',
    name: 'UX/UI',
    description: 'Experiência do usuário, fluxos, usabilidade',
    papel: 'UX Researcher',
    modos: ['multi-perspectiva', 'consultor', 'pitfalls'],
    defaultCondicao: 'Friction points mapeados e recomendações priorizadas',
  },
  {
    id: 'devops',
    name: 'DevOps',
    description: 'Infraestrutura, CI/CD, observabilidade e SRE',
    papel: 'SRE',
    modos: ['criar-sistema', 'metrics-mode', 'pitfalls'],
    defaultCondicao: 'Runbook gerado e SLOs definidos',
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Revisão técnica aprofundada com foco em qualidade e manutenção',
    papel: 'Tech Lead',
    modos: ['revisar-codigo', 'pitfalls', 'consultor'],
    defaultCondicao: 'Todos os issues críticos e sugestões de refactor documentados',
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'README, ADR, JSDoc, changelogs e guias de uso',
    papel: 'Technical Writer',
    modos: ['documentacao', 'context-stack'],
    defaultCondicao: 'Documentação completa, clara e pronta para publicar',
  },
]

export function getSkillById(id) {
  return SKILLS.find((s) => s.id === id)
}

export function getSkillChoices() {
  return SKILLS.map((s) => ({
    name: `${s.name.padEnd(22)} — ${s.description}`,
    value: s.id,
  }))
}
