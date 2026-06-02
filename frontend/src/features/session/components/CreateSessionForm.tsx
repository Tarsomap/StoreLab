import { useState, FormEvent } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Banknote, Cpu, ShoppingBag, Timer } from 'lucide-react';
import type {
  CapexCatalogEntry,
  CapexConfigFormValues,
  CategoryCatalogEntry,
  CategoryConfigFormValues,
  Session,
} from '../types';

interface CreateSessionFormProps {
  categoryCatalog: CategoryCatalogEntry[];
  capexCatalog: CapexCatalogEntry[];
  categoryConfigs: Record<string, CategoryConfigFormValues>;
  capexConfigs: Record<string, CapexConfigFormValues>;
  onCategoryConfigChange: (
    id: string,
    field: keyof CategoryConfigFormValues,
    value: string,
  ) => void;
  onCapexConfigChange: (
    id: string,
    field: keyof CapexConfigFormValues,
    value: string,
  ) => void;
  onCreated: (session: Session) => void;
  onCancel: () => void;
}

/** Formulário inline de criação de nova sessão. */
export function CreateSessionForm({
  categoryCatalog,
  capexCatalog,
  categoryConfigs,
  capexConfigs,
  onCategoryConfigChange,
  onCapexConfigChange,
  onCreated,
  onCancel,
}: CreateSessionFormProps) {
  const [newName, setNewName] = useState('');
  const [newDemand, setNewDemand] = useState('1000');
  const [newCash, setNewCash] = useState('700000');

  const [cashierSalary, setCashierSalary] = useState('1000');
  const [serviceSalary, setServiceSalary] = useState('1200');
  const [baseLicenseCost, setBaseLicenseCost] = useState('1200');
  const [maintenanceCost, setMaintenanceCost] = useState('400');
  const [interestRate, setInterestRate] = useState('12');

  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState('15');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const isFilledNumber = (value: string) =>
    value.trim().length > 0 && Number.isFinite(Number(value));
  const isFilledInteger = (value: string) =>
    isFilledNumber(value) && Number.isInteger(Number(value));

  const demandValue = Number(newDemand);
  const cashValue = Number(newCash);
  const cashierSalaryValue = Number(cashierSalary);
  const serviceSalaryValue = Number(serviceSalary);
  const baseLicenseCostValue = Number(baseLicenseCost);
  const maintenanceCostValue = Number(maintenanceCost);
  const interestRatePercentValue = Number(interestRate);
  const interestRateValue = interestRatePercentValue / 100;
  const categoryConfigsValid = categoryCatalog.every((category) => {
    const values = categoryConfigs[category.id];
    if (!values) return false;
    const stockAvailable = Number(values.stockAvailable);
    const unitCost = Number(values.unitCost);
    const taxRate = Number(values.taxRate);
    const breakageRate = Number(values.breakageRate);
    const agingRate = Number(values.agingRate);
    return (
      isFilledInteger(values.stockAvailable) &&
      stockAvailable > 0 &&
      isFilledNumber(values.unitCost) &&
      unitCost >= 0 &&
      isFilledNumber(values.taxRate) &&
      taxRate >= 0 &&
      isFilledNumber(values.breakageRate) &&
      breakageRate >= 0 &&
      isFilledNumber(values.agingRate) &&
      agingRate >= 0
    );
  });
  const capexConfigsValid = capexCatalog.every((capex) => {
    const values = capexConfigs[capex.id];
    if (!values) return false;
    const acquisitionCost = Number(values.acquisitionCost);
    const downtimeFixedDays = Number(values.downtimeFixedDays);
    const monthlyLicenseDelta = Number(values.monthlyLicenseDelta);
    const maintenanceSaving = Number(values.maintenanceSaving);
    const slaRiskPercent = Number(values.slaRiskPercent);
    return (
      isFilledNumber(values.acquisitionCost) &&
      acquisitionCost >= 0 &&
      isFilledInteger(values.downtimeFixedDays) &&
      downtimeFixedDays >= 0 &&
      isFilledNumber(values.monthlyLicenseDelta) &&
      monthlyLicenseDelta >= 0 &&
      isFilledNumber(values.maintenanceSaving) &&
      maintenanceSaving >= 0 &&
      isFilledNumber(values.slaRiskPercent) &&
      slaRiskPercent >= 0
    );
  });
  const canCreate =
    newName.trim().length > 0 &&
    categoryCatalog.length > 0 &&
    capexCatalog.length > 0 &&
    isFilledNumber(newDemand) &&
    demandValue > 0 &&
    isFilledNumber(newCash) &&
    cashValue > 0 &&
    isFilledNumber(cashierSalary) &&
    cashierSalaryValue > 0 &&
    isFilledNumber(serviceSalary) &&
    serviceSalaryValue > 0 &&
    isFilledNumber(baseLicenseCost) &&
    baseLicenseCostValue >= 0 &&
    isFilledNumber(maintenanceCost) &&
    maintenanceCostValue >= 0 &&
    isFilledNumber(interestRate) &&
    interestRatePercentValue >= 0 &&
    categoryConfigsValid &&
    capexConfigsValid;

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError('');
    if (!canCreate) {
      setCreateError('Preencha todos os campos obrigatórios com valores válidos.');
      return;
    }
    setCreating(true);

    try {
      const session = await api.post<Session>('/sessions', {
        name: newName.trim(),
        totalDemand: demandValue,
        initialCash: cashValue,
        cashierSalary: cashierSalaryValue,
        serviceSalary: serviceSalaryValue,
        baseLicenseCost: baseLicenseCostValue,
        maintenanceCost: maintenanceCostValue,
        interestRate: interestRateValue,
        categoryConfigs: categoryCatalog.map((category) => {
          const values = categoryConfigs[category.id];
          return {
            categoryId: category.id,
            stockAvailable: Number(values.stockAvailable),
            unitCost: Number(values.unitCost),
            taxRate: Number(values.taxRate) / 100,
            breakageRate: Number(values.breakageRate) / 100,
            agingRate: Number(values.agingRate) / 100,
          };
        }),
        capexConfigs: capexCatalog.map((capex) => {
          const values = capexConfigs[capex.id];
          return {
            capexOptionId: capex.id,
            acquisitionCost: Number(values.acquisitionCost),
            downtimeFixedDays: Number(values.downtimeFixedDays),
            monthlyLicenseDelta: Number(values.monthlyLicenseDelta),
            maintenanceSaving: Number(values.maintenanceSaving),
            slaRiskPercent: Number(values.slaRiskPercent) / 100,
          };
        }),
        ...(timerEnabled && timerMinutes
          ? { timerEnabled: true, timerDuration: Number(timerMinutes) * 60 }
          : {}),
      });
      toast.success('Sessão criada');
      onCreated(session);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erro ao criar sessão');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold font-display">Nova sessão</CardTitle>
      </CardHeader>
      <Separator className="my-4" />
      <form onSubmit={handleCreate}>
        <CardContent className="space-y-6 pt-0">
          {createError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
              {createError}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="new-name" className="text-sm text-muted-foreground">
                Nome da sessão
              </Label>
              <Input
                id="new-name"
                placeholder="Ex: Turma A"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-demand" className="text-sm text-muted-foreground">
                Demanda total
              </Label>
              <Input
                id="new-demand"
                type="number"
                min={1}
                required
                value={newDemand}
                onChange={(e) => setNewDemand(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-cash" className="text-sm text-muted-foreground">
                Caixa inicial (R$)
              </Label>
              <Input
                id="new-cash"
                type="number"
                min={1}
                required
                value={newCash}
                onChange={(e) => setNewCash(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Custos do Plano Operacional
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="cashier-salary" className="text-sm text-muted-foreground">
                  Salário op. de caixa (R$)
                </Label>
                <Input
                  id="cashier-salary"
                  type="number"
                  min={1}
                  required
                  value={cashierSalary}
                  onChange={(e) => setCashierSalary(e.target.value)}
                  placeholder="Ex: 1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-salary" className="text-sm text-muted-foreground">
                  Salário op. de serviço (R$)
                </Label>
                <Input
                  id="service-salary"
                  type="number"
                  min={1}
                  required
                  value={serviceSalary}
                  onChange={(e) => setServiceSalary(e.target.value)}
                  placeholder="Ex: 1200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license-cost" className="text-sm text-muted-foreground">
                  Licença de software base (R$)
                </Label>
                <Input
                  id="license-cost"
                  type="number"
                  min={0}
                  required
                  value={baseLicenseCost}
                  onChange={(e) => setBaseLicenseCost(e.target.value)}
                  placeholder="Ex: 1200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance-cost" className="text-sm text-muted-foreground">
                  Manutenção (R$)
                </Label>
                <Input
                  id="maintenance-cost"
                  type="number"
                  min={0}
                  required
                  value={maintenanceCost}
                  onChange={(e) => setMaintenanceCost(e.target.value)}
                  placeholder="Ex: 400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interest-rate" className="text-sm text-muted-foreground">
                  Juros (% a.m.)
                </Label>
                <Input
                  id="interest-rate"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="Ex: 12"
                />
              </div>
            </div>
          </div>
          {categoryCatalog.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Parâmetros por categoria
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {categoryCatalog.map((category) => (
                  <div key={category.id} className="rounded-xl border bg-card p-3">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {category.name}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-5">
                      <div className="space-y-1.5">
                        <Label htmlFor={`stock-${category.id}`} className="text-xs text-muted-foreground">
                          Estoque
                        </Label>
                        <Input
                          id={`stock-${category.id}`}
                          type="number"
                          min={1}
                          required
                          value={categoryConfigs[category.id]?.stockAvailable ?? ''}
                          onChange={(e) =>
                            onCategoryConfigChange(category.id, 'stockAvailable', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`unit-cost-${category.id}`} className="text-xs text-muted-foreground">
                          Custo (R$)
                        </Label>
                        <Input
                          id={`unit-cost-${category.id}`}
                          type="number"
                          min={0}
                          required
                          value={categoryConfigs[category.id]?.unitCost ?? ''}
                          onChange={(e) =>
                            onCategoryConfigChange(category.id, 'unitCost', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`tax-${category.id}`} className="text-xs text-muted-foreground">
                          Imposto %
                        </Label>
                        <Input
                          id={`tax-${category.id}`}
                          type="number"
                          min={0}
                          step="0.01"
                          required
                          value={categoryConfigs[category.id]?.taxRate ?? ''}
                          onChange={(e) =>
                            onCategoryConfigChange(category.id, 'taxRate', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`breakage-${category.id}`} className="text-xs text-muted-foreground">
                          Quebra %
                        </Label>
                        <Input
                          id={`breakage-${category.id}`}
                          type="number"
                          min={0}
                          step="0.01"
                          required
                          value={categoryConfigs[category.id]?.breakageRate ?? ''}
                          onChange={(e) =>
                            onCategoryConfigChange(category.id, 'breakageRate', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`aging-${category.id}`} className="text-xs text-muted-foreground">
                          Aging %
                        </Label>
                        <Input
                          id={`aging-${category.id}`}
                          type="number"
                          min={0}
                          step="0.01"
                          required
                          value={categoryConfigs[category.id]?.agingRate ?? ''}
                          onChange={(e) =>
                            onCategoryConfigChange(category.id, 'agingRate', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {capexCatalog.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Parâmetros dos CAPEX
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {capexCatalog.map((capex) => (
                  <div key={capex.id} className="rounded-xl border bg-card p-3">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {capex.name}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-5">
                      <div className="space-y-1.5">
                        <Label htmlFor={`capex-cost-${capex.id}`} className="text-xs text-muted-foreground">
                          Custo (R$)
                        </Label>
                        <Input
                          id={`capex-cost-${capex.id}`}
                          type="number"
                          min={0}
                          required
                          value={capexConfigs[capex.id]?.acquisitionCost ?? ''}
                          onChange={(e) =>
                            onCapexConfigChange(capex.id, 'acquisitionCost', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`capex-days-${capex.id}`} className="text-xs text-muted-foreground">
                          SLA dias
                        </Label>
                        <Input
                          id={`capex-days-${capex.id}`}
                          type="number"
                          min={0}
                          step={1}
                          required
                          value={capexConfigs[capex.id]?.downtimeFixedDays ?? ''}
                          onChange={(e) =>
                            onCapexConfigChange(capex.id, 'downtimeFixedDays', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`capex-license-${capex.id}`} className="text-xs text-muted-foreground">
                          Licença (R$)
                        </Label>
                        <Input
                          id={`capex-license-${capex.id}`}
                          type="number"
                          min={0}
                          required
                          value={capexConfigs[capex.id]?.monthlyLicenseDelta ?? ''}
                          onChange={(e) =>
                            onCapexConfigChange(capex.id, 'monthlyLicenseDelta', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`capex-saving-${capex.id}`} className="text-xs text-muted-foreground">
                          Economia (R$)
                        </Label>
                        <Input
                          id={`capex-saving-${capex.id}`}
                          type="number"
                          min={0}
                          required
                          value={capexConfigs[capex.id]?.maintenanceSaving ?? ''}
                          onChange={(e) =>
                            onCapexConfigChange(capex.id, 'maintenanceSaving', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`capex-risk-${capex.id}`} className="text-xs text-muted-foreground">
                          Risco %
                        </Label>
                        <Input
                          id={`capex-risk-${capex.id}`}
                          type="number"
                          min={0}
                          step="0.01"
                          required
                          value={capexConfigs[capex.id]?.slaRiskPercent ?? ''}
                          onChange={(e) =>
                            onCapexConfigChange(capex.id, 'slaRiskPercent', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timer */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                id="timer-enabled"
                type="checkbox"
                checked={timerEnabled}
                onChange={(e) => setTimerEnabled(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border"
              />
              <Label
                htmlFor="timer-enabled"
                className="cursor-pointer flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <Timer className="h-3.5 w-3.5" />
                Ativar timer por rodada
              </Label>
            </div>
            {timerEnabled && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="timer-minutes" className="text-sm text-muted-foreground">
                  Duração por rodada (minutos)
                </Label>
                <Input
                  id="timer-minutes"
                  type="number"
                  min={1}
                  max={180}
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(e.target.value)}
                  className="max-w-[120px]"
                />
              </div>
            )}
          </div>
        </CardContent>

        <div className="px-6 pb-6 flex gap-3">
          <Button type="submit" disabled={creating || !canCreate} className="sm:w-auto">
            {creating ? 'Criando...' : 'Criar sessão'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
