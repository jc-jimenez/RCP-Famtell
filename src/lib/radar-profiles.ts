export interface SCIANSubsector {
  code: string
  name: string
  pitch?: string // por qué necesitan 3PL
}

export interface SCIANSector {
  code: string
  name: string
  icon: string
  subsectors: SCIANSubsector[]
}

export interface RadarProfile {
  id: string
  name: string
  description: string
  recommendedCodes: string[] // códigos SCIAN pre-seleccionados
}

// ─── Árbol SCIAN relevante para prospección 3PL ─────────────────────────────

export const SCIAN_SECTORS: SCIANSector[] = [
  {
    code: '31',
    name: 'Manufactura',
    icon: '🏭',
    subsectors: [
      { code: '3111', name: 'Elaboración de alimentos para animales', pitch: 'Distribución a granel, almacén climatizado' },
      { code: '3112', name: 'Molienda de granos y semillas', pitch: 'Almacén seco, distribución regional' },
      { code: '3113', name: 'Elaboración de azúcares y confitería', pitch: 'Almacén seco, distribución masiva' },
      { code: '3114', name: 'Conservación de frutas, verduras y alimentos', pitch: 'Cadena de frío, almacén refrigerado' },
      { code: '3115', name: 'Elaboración de productos lácteos', pitch: 'Cadena de frío, distribución capilar' },
      { code: '3116', name: 'Matanza, empacado y procesamiento de carne', pitch: 'Cadena de frío, cumplimiento SENASICA' },
      { code: '3117', name: 'Preparación de pescados y mariscos', pitch: 'Cadena de frío, exportación' },
      { code: '3118', name: 'Elaboración de productos de panadería', pitch: 'Distribución frecuente, última milla' },
      { code: '3119', name: 'Otras industrias alimentarias', pitch: 'Almacén flexible, distribución nacional' },
      { code: '3121', name: 'Elaboración de bebidas no alcohólicas', pitch: 'Almacén masivo, distribución capilar' },
      { code: '3122', name: 'Elaboración de bebidas alcohólicas', pitch: 'Almacén fiscal, importación/exportación' },
      { code: '3131', name: 'Preparación e hilado de fibras textiles', pitch: 'Almacén seco, logística de importación' },
      { code: '3152', name: 'Confección de prendas de vestir', pitch: 'Cross-docking, importación Asia' },
      { code: '3161', name: 'Curtido y acabado de cuero y piel', pitch: 'Almacén especializado, importación' },
      { code: '3162', name: 'Confección de calzado', pitch: 'Almacén, distribución nacional' },
      { code: '3251', name: 'Fabricación de productos químicos básicos', pitch: 'Almacén especializado, cumplimiento normativo' },
      { code: '3252', name: 'Fabricación de resinas y hule sintético', pitch: 'Almacén industrial, distribución nacional' },
      { code: '3254', name: 'Fabricación de productos farmacéuticos', pitch: 'Almacén controlado, frío, trazabilidad' },
      { code: '3261', name: 'Fabricación de productos de plástico', pitch: 'Almacén industrial, distribución' },
      { code: '3341', name: 'Fabricación de computadoras y periféricos', pitch: 'Almacén fiscal, importación Asia' },
      { code: '3342', name: 'Fabricación de equipos de comunicación', pitch: 'Almacén fiscal, importación' },
      { code: '3344', name: 'Fabricación de semiconductores', pitch: 'Almacén especializado, alta seguridad' },
      { code: '3351', name: 'Fabricación de accesorios de iluminación', pitch: 'Almacén, importación, distribución' },
      { code: '3361', name: 'Fabricación de automóviles y camiones', pitch: 'JIT, cross-docking, partes automotrices' },
      { code: '3362', name: 'Fabricación de carrocerías y remolques', pitch: 'Almacén industrial, distribución' },
      { code: '3363', name: 'Fabricación de partes para vehículos', pitch: 'JIT, importación, almacén automotriz' },
    ],
  },
  {
    code: '43',
    name: 'Comercio al por Mayor',
    icon: '📦',
    subsectors: [
      { code: '4311', name: 'Comercio al por mayor de abarrotes y alimentos', pitch: 'Almacén seco, distribución regional' },
      { code: '4312', name: 'Comercio al por mayor de bebidas', pitch: 'Almacén, distribución capilar' },
      { code: '4321', name: 'Comercio al por mayor de ropa y accesorios', pitch: 'Cross-docking, importación, distribución' },
      { code: '4322', name: 'Comercio al por mayor de calzado', pitch: 'Almacén, cross-docking, importación' },
      { code: '4331', name: 'Comercio al por mayor de productos farmacéuticos', pitch: 'Almacén controlado, frío, trazabilidad' },
      { code: '4332', name: 'Comercio al por mayor de artículos de perfumería', pitch: 'Almacén seco, distribución nacional' },
      { code: '4341', name: 'Comercio al por mayor de materias primas agropecuarias', pitch: 'Almacén a granel, distribución regional' },
      { code: '4342', name: 'Comercio al por mayor de flores y plantas', pitch: 'Cadena de frío, distribución urgente' },
      { code: '4351', name: 'Comercio al por mayor de maquinaria y equipo', pitch: 'Almacén industrial, importación' },
      { code: '4352', name: 'Comercio al por mayor de equipo de cómputo', pitch: 'Almacén fiscal, importación Asia' },
      { code: '4353', name: 'Comercio al por mayor de equipo médico', pitch: 'Almacén controlado, importación' },
      { code: '4361', name: 'Comercio al por mayor de materiales de construcción', pitch: 'Almacén a granel, distribución regional' },
      { code: '4371', name: 'Comercio al por mayor de combustibles', pitch: 'Almacén especializado, normativa SENER' },
      { code: '4391', name: 'Comercio al por mayor de enseres domésticos', pitch: 'Almacén, e-commerce, última milla' },
      { code: '4392', name: 'Comercio al por mayor de juguetes', pitch: 'Almacén, temporadas, importación' },
      { code: '4399', name: 'Otros comercios al por mayor', pitch: 'Almacén flexible, distribución nacional' },
    ],
  },
  {
    code: '46',
    name: 'Comercio al por Menor',
    icon: '🛒',
    subsectors: [
      { code: '4611', name: 'Comercio al por menor de abarrotes y alimentos', pitch: 'Reabasto frecuente, última milla' },
      { code: '4621', name: 'Comercio al por menor de artículos de ferretería', pitch: 'Distribución regional, almacén' },
      { code: '4631', name: 'Comercio al por menor de ropa y accesorios', pitch: 'Distribución a tiendas, e-commerce' },
      { code: '4641', name: 'Comercio al por menor de artículos para el hogar', pitch: 'E-commerce, última milla, fulfillment' },
      { code: '4651', name: 'Comercio al por menor de electrónica', pitch: 'Almacén fiscal, fulfillment, e-commerce' },
      { code: '4661', name: 'Comercio al por menor de artículos deportivos', pitch: 'Fulfillment, distribución nacional' },
      { code: '4671', name: 'Comercio al por menor en tiendas de autoservicio', pitch: 'Abasto continuo, cross-docking' },
    ],
  },
  {
    code: '49',
    name: 'Transporte y Logística',
    icon: '🚛',
    subsectors: [
      { code: '4921', name: 'Mensajería y paquetería', pitch: 'Alianza, última milla compartida' },
      { code: '4922', name: 'Servicio de entrega de correo', pitch: 'Integración last-mile' },
      { code: '4931', name: 'Almacenamiento y depósito', pitch: 'Coopetencia, capacidad compartida' },
      { code: '4932', name: 'Refrigeración y almacenamiento en frío', pitch: 'Alianza o cliente de capacidad' },
    ],
  },
  {
    code: '52',
    name: 'Servicios Financieros e Importadores',
    icon: '🏦',
    subsectors: [
      { code: '5241', name: 'Instituciones de seguros', pitch: 'Logística de siniestros, almacén de recuperados' },
      { code: '5251', name: 'Fondos y fideicomisos financieros', pitch: 'Garantías en almacén fiscal' },
    ],
  },
  {
    code: '72',
    name: 'Hospitalidad y Alimentos',
    icon: '🏨',
    subsectors: [
      { code: '7211', name: 'Hoteles y similares', pitch: 'Abasto de suministros, almacén satélite' },
      { code: '7221', name: 'Restaurantes y servicios de comida', pitch: 'Distribución de insumos, cadena de frío' },
    ],
  },
]

// ─── Perfiles de prospección ─────────────────────────────────────────────────

export const RADAR_PROFILES: RadarProfile[] = [
  {
    id: 'famtell-3pl',
    name: 'Famtell — Operador 3PL',
    description: 'Empresas que necesitan almacén fiscal, distribución, importación o logística tercerizada',
    recommendedCodes: [
      // Manufactura con flujo exportación/importación
      '3122', '3254', '3341', '3342', '3361', '3363',
      // Comercio al mayor — importadores y distribuidores
      '4311', '4321', '4322', '4331', '4351', '4352', '4353',
      // Comercio al menor con e-commerce / fulfillment
      '4641', '4651', '4671',
    ],
  },
  {
    id: 'custom',
    name: 'Personalizado',
    description: 'Selecciona manualmente los sectores que te interesan',
    recommendedCodes: [],
  },
]

export function getProfile(id: string): RadarProfile {
  return RADAR_PROFILES.find(p => p.id === id) ?? RADAR_PROFILES[0]
}

export function getSectorByCode(code: string): SCIANSector | undefined {
  return SCIAN_SECTORS.find(s => s.code === code)
}

export function getSubsectorByCode(code: string): SCIANSubsector | undefined {
  for (const sector of SCIAN_SECTORS) {
    const sub = sector.subsectors.find(s => s.code === code)
    if (sub) return sub
  }
}
