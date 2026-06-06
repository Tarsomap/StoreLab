import { PrismaClient, CategoryName, CapexType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ─────────────────────────────────────────
  // CATEGORIES
  // Fonte: docs/agent/spec.md v1.1
  // ─────────────────────────────────────────
  const categories = [
    {
      name: CategoryName.PERECIVEIS,
      unitCost:     20.00,
      taxRate:      0.12,   // 12%
      breakageRate: 0.020,  // 2.0%
      agingRate:    0.058,  // 5.8%
      stockAvailable: 4000,
    },
    {
      name: CategoryName.MERCEARIA,
      unitCost:     30.00,
      taxRate:      0.07,   // 7%
      breakageRate: 0.015,  // 1.5%
      agingRate:    0.008,  // 0.8%
      stockAvailable: 6000,
    },
    {
      name: CategoryName.ELETRO,
      unitCost:     500.00,
      taxRate:      0.25,   // 25% — tabela oficial (gabarito xlsx mostra 0% por erro manual)
      breakageRate: 0.000,  // 0.0%
      agingRate:    0.013,  // 1.3%
      stockAvailable: 700,
    },
    {
      name: CategoryName.HIPEL,
      unitCost:     45.00,
      taxRate:      0.17,   // 17%
      breakageRate: 0.010,  // 1.0%
      agingRate:    0.011,  // 1.1%
      stockAvailable: 5000,
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where:  { name: category.name },
      update: category,
      create: category,
    });
    console.log(`  ✅ Categoria: ${category.name}`);
  }

  // ─────────────────────────────────────────
  // CAPEX OPTIONS
  // Fonte: docs/agent/spec.md v1.1
  //
  // downtimeFixedDays: valor fixo da fórmula
  //   diasParados = downtimeFixedDays + SLA_TABLE[serviceOperators]
  //
  // maintenanceSaving: economia mensal gerada pelo CAPEX
  //   (FREEZER elimina R$400/mês de manutenção)
  //
  // monthlyLicenseDelta: acréscimo mensal na licença de software
  //   base = R$500/mês
  // ─────────────────────────────────────────
  const capexOptions = [
    {
      name:                'Segurança',
      type:                CapexType.SECURITY,
      acquisitionCost:     50_000,
      downtimeFixedDays:   2,
      monthlyLicenseDelta: 100,    // +R$100/mês
      maintenanceSaving:   0,
      slaRiskPercent:      0.15,   // 15% chance de incidente por rodada
    },
    {
      name:                'Balança / Freezer',
      type:                CapexType.FREEZER,
      acquisitionCost:     75_000,
      downtimeFixedDays:   1,
      monthlyLicenseDelta: 0,
      maintenanceSaving:   400,    // elimina R$400/mês de manutenção
      slaRiskPercent:      0.10,   // 10% chance de incidente por rodada
    },
    {
      name:                'Redes',
      type:                CapexType.NETWORK,
      acquisitionCost:     80_000,
      downtimeFixedDays:   2,
      monthlyLicenseDelta: 0,
      maintenanceSaving:   0,
      slaRiskPercent:      0.05,   // 5% chance de incidente por rodada
    },
    {
      name:                'Melhorias no Site',
      type:                CapexType.SITE,
      acquisitionCost:     65_000,
      downtimeFixedDays:   1,
      monthlyLicenseDelta: 150,    // +R$150/mês
      maintenanceSaving:   0,
      slaRiskPercent:      0.10,   // 10% chance de incidente por rodada
    },
    {
      name:                'Self Checkout',
      type:                CapexType.SELF_CHECKOUT,
      acquisitionCost:     80_000,
      downtimeFixedDays:   2,
      monthlyLicenseDelta: 320,    // +R$320/mês (R$80 × 4 unidades)
      maintenanceSaving:   0,
      slaRiskPercent:      0.20,   // 20% chance de incidente por rodada
    },
    {
      name:                'Melhoria Contínua',
      type:                CapexType.AUTOMATION,
      acquisitionCost:     45_000,
      downtimeFixedDays:   0,      // não gera evento de incidente
      monthlyLicenseDelta: 0,
      maintenanceSaving:   0,
      slaRiskPercent:      0.00,   // sem risco de SLA
    },
  ];

  for (const capex of capexOptions) {
    await prisma.capexOption.upsert({
      where:  { type: capex.type },
      update: capex,
      create: capex,
    });
    console.log(`  ✅ CAPEX: ${capex.name}`);
  }

  // ─────────────────────────────────────────
  // EVENT TEMPLATES
  // Catálogo de eventos predefinidos
  // ─────────────────────────────────────────
  const eventTemplates = [
    {
      name: 'Crise de abastecimento',
      description: 'Dificuldade imprevista na cadeia de suprimentos afeta o estoque de produtos essenciais.',
    },
    {
      name: 'Aumento inesperado de demanda',
      description: 'Pico sazonal não previsto ou tendência súbita eleva rapidamente a procura na loja.',
    },
    {
      name: 'Falha operacional interna',
      description: 'Erro em processos chave da loja, afetando atendimento ou gestão de estoque.',
    },
    {
      name: 'Mudança regulatória',
      description: 'Nova legislação ou taxa municipal que exige adaptação rápida das operações.',
    },
    {
      name: 'Evento climático',
      description: 'Condições meteorológicas extremas reduzem significativamente o fluxo de clientes na região.',
    },
    {
      name: 'Promoção agressiva da concorrência',
      description: 'Concorrente próximo inicia campanha de preços baixos, ameaçando market share.',
    },
    {
      name: 'Aumento no custo de insumos',
      description: 'Inflação ou reajuste repentino eleva custos operacionais e margem de produtos.',
    },
    {
      name: 'Problema logístico/distribuição',
      description: 'Atrasos no centro de distribuição comprometem as entregas para a loja.',
    },
    {
      name: 'Queda de energia / indisponibilidade operacional',
      description: 'Apagão prolongado ou falha grave de sistema paralisa temporariamente as vendas.',
    },
    {
      name: 'Crise de reputação / repercussão negativa',
      description: 'Reclamação viral ou incidente local afeta temporariamente a imagem da loja.',
    },
  ];

  for (const event of eventTemplates) {
    await prisma.eventTemplate.upsert({
      where:  { name: event.name },
      update: event,
      create: event,
    });
    console.log(`  ✅ Evento: ${event.name}`);
  }

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('   4 categorias | 6 opções de CAPEX | 10 eventos predefinidos');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
