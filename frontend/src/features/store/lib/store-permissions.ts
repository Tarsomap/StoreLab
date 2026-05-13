// Stores podem ser excluidas em qualquer status (decisao de produto).
// Stores so' permitem editar o nome.
export function canDeleteStore(): boolean {
  return true;
}

export function canEditStore(): boolean {
  return true;
}
