export const SKILLS = [
  {
    id: 'security-audit',
    name: 'Security Audit',
    description: 'Revisão de segurança completa: código, dependências, surface de ataque',
    papel: 'Security Auditor',
    modos: ['revisar-codigo', 'pitfalls', 'multi-perspectiva'],
    defaultCondicao: 'Todas as vulnerabilidades críticas identificadas e mitigadas',
    contextTemplate: `# Security Audit Checklist

## Scope
- [ ] Autenticação e autorização
- [ ] Validação de inputs e sanitização
- [ ] Exposição de dados sensíveis (logs, responses, env vars)
- [ ] Dependências com CVEs conhecidos
- [ ] SQL/NoSQL injection, XSS, CSRF
- [ ] Rate limiting e proteção contra DoS
- [ ] Secrets hardcoded no código

## Context
[Cole aqui o código ou descreva o sistema a auditar]`,
    chain: [
      { modo: 'revisar-codigo',    label: '1/3 — Revisão de código (bugs e segurança)' },
      { modo: 'pitfalls',          label: '2/3 — Pitfalls (o que pode ser explorado)' },
      { modo: 'multi-perspectiva', label: '3/3 — Multi-perspectiva (Dev + Ops + Usuário)' },
    ],
  },
  {
    id: 'data-science',
    name: 'Data Science',
    description: 'Pipeline de dados, análise estatística e modelagem',
    papel: 'Data Scientist',
    modos: ['metrics-mode', 'criar-sistema', 'compare'],
    defaultCondicao: 'Modelo validado e KPIs definidos',
    contextTemplate: `# Data Science Context

## Problema
[Descreva o problema de negócio]

## Dados disponíveis
- Fonte:
- Volume estimado:
- Features principais:

## Objetivo do modelo
[Classificação / Regressão / Clustering / etc]

## Métricas de sucesso
[Accuracy, F1, RMSE, etc]`,
  },
  {
    id: 'database',
    name: 'Database',
    description: 'Design de schema, queries, índices e performance',
    papel: 'DBA',
    modos: ['criar-sistema', 'revisar-codigo', 'pitfalls'],
    defaultCondicao: 'Schema otimizado e queries com plano de execução validado',
    contextTemplate: `# Database Context

## Engine
[PostgreSQL / MySQL / MongoDB / SQLite / etc]

## Schema atual (se houver)
\`\`\`sql
-- cole aqui
\`\`\`

## Queries problemáticas
\`\`\`sql
-- cole aqui
\`\`\`

## Volume estimado
- Registros:
- QPS:
- Crescimento mensal:`,
  },
  {
    id: 'software-architect',
    name: 'Software Architect',
    description: 'Decisões de arquitetura, stack, trade-offs',
    papel: 'Arquiteto de Software Sênior',
    modos: ['criar-sistema', 'compare', 'multi-perspectiva'],
    defaultCondicao: 'ADR gerado e decisões documentadas',
    contextTemplate: `# Architecture Context

## Problema a resolver
[Descreva o sistema ou feature]

## Restrições
- Equipe:
- Prazo:
- Budget:
- Stack existente:

## Requisitos não-funcionais
- Latência alvo:
- Disponibilidade:
- Escala esperada:

## Opções em consideração
- Opção A:
- Opção B:`,
    chain: [
      { modo: 'criar-sistema',      label: '1/2 — Criar sistema (arquitetura e stack)' },
      { modo: 'multi-perspectiva',  label: '2/2 — Multi-perspectiva (validação por ângulos)' },
    ],
  },
  {
    id: 'ux-ui',
    name: 'UX/UI',
    description: 'Experiência do usuário, fluxos, usabilidade',
    papel: 'UX Researcher',
    modos: ['multi-perspectiva', 'consultor', 'pitfalls'],
    defaultCondicao: 'Friction points mapeados e recomendações priorizadas',
    contextTemplate: `# UX/UI Context

## Produto / Feature
[Descreva o produto ou funcionalidade]

## Usuário-alvo
- Perfil:
- Nível técnico:
- Principal objetivo:

## Fluxo atual (se houver)
[Descreva ou cole um esboço]

## Problema reportado
[O que os usuários reclamam ou onde abandonam]`,
  },
  {
    id: 'devops',
    name: 'DevOps',
    description: 'Infraestrutura, CI/CD, observabilidade e SRE',
    papel: 'SRE',
    modos: ['criar-sistema', 'metrics-mode', 'pitfalls'],
    defaultCondicao: 'Runbook gerado e SLOs definidos',
    contextTemplate: `# DevOps Context

## Stack de infra
[AWS / GCP / Azure / on-prem / etc]

## Serviços envolvidos
[Liste os serviços e dependências]

## Problema ou objetivo
[Deploy, incident, automação, etc]

## SLOs atuais (se houver)
- Availability:
- Latency p99:
- Error rate:

## Monitoramento existente
[Grafana / Datadog / CloudWatch / etc]`,
    chain: [
      { modo: 'criar-sistema',  label: '1/3 — Infra e CI/CD (design)' },
      { modo: 'metrics-mode',   label: '2/3 — SLOs e métricas (instrumentação)' },
      { modo: 'pitfalls',       label: '3/3 — Pitfalls (failure modes e edge cases)' },
    ],
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Revisão técnica aprofundada com foco em qualidade e manutenção',
    papel: 'Tech Lead',
    modos: ['revisar-codigo', 'pitfalls', 'consultor'],
    defaultCondicao: 'Todos os issues críticos e sugestões de refactor documentados',
    contextTemplate: `# Code Review Context

## PR / Mudança
[Descreva o que foi alterado]

## Contexto do negócio
[Por que essa mudança existe]

## Código para revisar
\`\`\`
[cole aqui]
\`\`\`

## Preocupações específicas
[O que você quer que seja olhado com mais atenção]`,
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'README, ADR, JSDoc, changelogs e guias de uso',
    papel: 'Technical Writer',
    modos: ['documentacao', 'context-stack'],
    defaultCondicao: 'Documentação completa, clara e pronta para publicar',
    contextTemplate: `# Documentation Context

## Tipo de documentação
[ ] README  [ ] ADR  [ ] JSDoc  [ ] Changelog  [ ] Guia de uso

## Audiência
[Desenvolvedor júnior / Sênior / Usuário final / etc]

## O que precisa ser documentado
[Descreva o sistema, API ou feature]

## Código ou interface relevante
\`\`\`
[cole aqui]
\`\`\``,
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
