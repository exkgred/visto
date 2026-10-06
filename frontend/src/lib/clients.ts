export interface Client {
  id: string
  name: string
  email: string
  document: string
  city: string
}

export const CLIENTS: Client[] = [
  {
    id: 'cli-acme',
    name: 'ACME Ltda',
    email: 'carla@acme.test',
    document: '12.345.678/0001-90',
    city: 'São Paulo',
  },
  {
    id: 'cli-norte',
    name: 'Loja Norte',
    email: 'compras@lojanorte.test',
    document: '23.456.789/0001-01',
    city: 'Manaus',
  },
  {
    id: 'cli-brasa',
    name: 'Oficina Brasa',
    email: 'forja@brasa.test',
    document: '34.567.890/0001-12',
    city: 'Belo Horizonte',
  },
  {
    id: 'cli-caldeira',
    name: 'Studio Caldeira',
    email: 'contato@studiocaldeira.test',
    document: '45.678.901/0001-23',
    city: 'Curitiba',
  },
  {
    id: 'cli-porto',
    name: 'Porto Atacadista',
    email: 'compras@portoatacado.test',
    document: '56.789.012/0001-34',
    city: 'Santos',
  },
  {
    id: 'cli-vale',
    name: 'Vale Verde Alimentos',
    email: 'comercial@valeverde.test',
    document: '67.890.123/0001-45',
    city: 'Campinas',
  },
  {
    id: 'cli-atlas',
    name: 'Atlas Engenharia',
    email: 'licitacoes@atlaseng.test',
    document: '78.901.234/0001-56',
    city: 'Brasília',
  },
  {
    id: 'cli-horizon',
    name: 'Horizon Logística',
    email: 'ops@horizonlog.test',
    document: '89.012.345/0001-67',
    city: 'Guarulhos',
  },
]

export function filterClients(query: string, catalog: Client[] = CLIENTS): Client[] {
  const term = query.trim().toLowerCase()
  if (!term) return catalog
  return catalog.filter((client) =>
    [client.name, client.email, client.document, client.city].some((value) =>
      value.toLowerCase().includes(term),
    ),
  )
}
