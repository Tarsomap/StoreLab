import { PrismaClient, CategoryName, CapexType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ─────────────────────────────────────────
  // CATEGORIES
  // Fonte: docs/pdf/arquitetura-tecnica.md § 6.1
  // ─────────────────────────────────────────
  const categories = [
    {
      name: CategoryName.PERECIVEIS,
      unitCost: 8.0,
      taxRate: 0.0925,   // 9.25%
      breakageRate: 0.03, // 3.0%
      agingRate: 0.02,    // 2.0%
    },
    {
      name: CategoryName.MERCEARIA,
      unitCost: 5.0,
      taxRate: 0.0765,   // 7.65%
      breakageRate: 0.01, // 1.0%
      agingRate: 0.0,     // 0.0%
    },
    {
      name: CategoryName.ELETRO,
      unitCost: 120.0,
      taxRate: 0.125,    // 12.50%
      breakageRate: 0.002, // 0.2%
      agingRate: 0.05,    // 5.0%
    },
    {
      name: CategoryName.HIPEL,
      unitCost: 45.0,
      taxRate: 0.0765,   // 7.65%
      breakageRate: 0.005, // 0.5%
      agingRate: 0.01,    // 1.0%
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    });
    console.log(`  ✅ Categoria: ${category.name}`);
  }

  // ─────────────────────────────────────────
  // CAPEX OPTIONS
  // Fonte: docs/pdf/arquitetura-tecnica.md § 6.2
  // ─────────────────────────────────────────
  const capexOptions = [
    {
      name: 'Segurança',
      type: CapexType.SECURITY,
      cost: 30_000,
      monthlyLicenseDelta: 2_000,
      slaImpactDays: 1,
      // Risco: 15% chance → 2% receita perdida (roubo)
    },
    {
      name: 'Câmara Fria (Freezer)',
      type: CapexType.FREEZER,
      cost: 80_000,
      monthlyLicenseDelta: 1_500,
      slaImpactDays: 2,
      // Risco: 10% chance → +30% aging em PERECIVEIS
    },
    {
      name: 'Rede / Infraestrutura',
      type: CapexType.NETWORK,
      cost: 50_000,
      monthlyLicenseDelta: 3_000,
      slaImpactDays: 1,
      // Risco: 5% chance → 1h downtime (sem vendas)
    },
    {
      name: 'Site / Branding Digital',
      type: CapexType.SITE,
      cost: 100_000,
      monthlyLicenseDelta: 5_000,
      slaImpactDays: 0,
      // Sem risco SLA — impacto em branding/demanda futura
    },
    {
      name: 'Self-Checkout',
      type: CapexType.SELF_CHECKOUT,
      cost: 60_000,
      monthlyLicenseDelta: 2_500,
      slaImpactDays: 0,
      // Sem risco SLA — reduz necessidade de operadores de caixa
    },
    {
      name: 'Automação de Estoque',
      type: CapexType.AUTOMATION,
      cost: 40_000,
      monthlyLicenseDelta: 1_000,
      slaImpactDays: 0,
      // Sem risco SLA — reduz breakage/aging
    },
  ];

  for (const capex of capexOptions) {
    await prisma.capexOption.upsert({
      where: { type: capex.type },
      update: capex,
      create: capex,
    });
    console.log(`  ✅ CAPEX: ${capex.name}`);
  }

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('   4 categorias | 6 opções de CAPEX');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
