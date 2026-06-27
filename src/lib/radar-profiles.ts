export interface SCIANSubsector {
  code: string
  name: string
  pitch?: string // por qué necesitan 3PL
  keywords: string[] // términos para buscar en BuscarEntidad de DENUE
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
      { code: '3111', name: 'Elaboración de alimentos para animales', pitch: 'Distribución a granel, almacén climatizado', keywords: ['ALIMENTOS ANIMALES', 'ALIMENTO BALANCEADO', 'AGROPECUARIA'] },
      { code: '3112', name: 'Molienda de granos y semillas', pitch: 'Almacén seco, distribución regional', keywords: ['MOLINO', 'GRANOS', 'SEMILLAS', 'HARINERA'] },
      { code: '3113', name: 'Elaboración de azúcares y confitería', pitch: 'Almacén seco, distribución masiva', keywords: ['DULCES', 'CONFITERIA', 'AZUCAR', 'CHOCOLATES', 'GOLOSINAS'] },
      { code: '3114', name: 'Conservación de frutas, verduras y alimentos', pitch: 'Cadena de frío, almacén refrigerado', keywords: ['CONSERVAS', 'ENLATADOS', 'CONGELADOS', 'FRUTAS Y VERDURAS'] },
      { code: '3115', name: 'Elaboración de productos lácteos', pitch: 'Cadena de frío, distribución capilar', keywords: ['LACTEOS', 'LACTEA', 'LECHERA', 'QUESOS', 'YOGURT'] },
      { code: '3116', name: 'Matanza, empacado y procesamiento de carne', pitch: 'Cadena de frío, cumplimiento SENASICA', keywords: ['CARNES', 'EMPACADORA', 'FRIGORIFICO', 'RASTRO', 'PROCESADORA CARNES'] },
      { code: '3117', name: 'Preparación de pescados y mariscos', pitch: 'Cadena de frío, exportación', keywords: ['MARISCOS', 'PESCADOS', 'ACUICOLA', 'CAMARONES'] },
      { code: '3118', name: 'Elaboración de productos de panadería', pitch: 'Distribución frecuente, última milla', keywords: ['PANIFICADORA', 'PANADERIA', 'PASTELERIA', 'GALLETERA'] },
      { code: '3119', name: 'Otras industrias alimentarias', pitch: 'Almacén flexible, distribución nacional', keywords: ['ALIMENTOS', 'INDUSTRIA ALIMENTARIA', 'PROCESADORA ALIMENTOS'] },
      { code: '3121', name: 'Elaboración de bebidas no alcohólicas', pitch: 'Almacén masivo, distribución capilar', keywords: ['EMBOTELLADORA', 'BEBIDAS', 'REFRESCOS', 'JUGOS', 'AGUA'] },
      { code: '3122', name: 'Elaboración de bebidas alcohólicas', pitch: 'Almacén fiscal, importación/exportación', keywords: ['CERVECERA', 'VINOS', 'LICORES', 'TEQUILA', 'DESTILADORA'] },
      { code: '3131', name: 'Preparación e hilado de fibras textiles', pitch: 'Almacén seco, logística de importación', keywords: ['TEXTIL', 'HILOS', 'FIBRAS', 'TELAS'] },
      { code: '3152', name: 'Confección de prendas de vestir', pitch: 'Cross-docking, importación Asia', keywords: ['CONFECCION', 'MAQUILADORA', 'ROPA', 'PRENDAS', 'VESTIMENTA'] },
      { code: '3161', name: 'Curtido y acabado de cuero y piel', pitch: 'Almacén especializado, importación', keywords: ['CURTIDURIA', 'PIELES', 'CUERO', 'TALABARTERIA'] },
      { code: '3162', name: 'Confección de calzado', pitch: 'Almacén, distribución nacional', keywords: ['CALZADO', 'ZAPATERIA', 'BOTAS', 'ZAPATOS'] },
      { code: '3251', name: 'Fabricación de productos químicos básicos', pitch: 'Almacén especializado, cumplimiento normativo', keywords: ['QUIMICA', 'PRODUCTOS QUIMICOS', 'SOLVENTES', 'PINTURAS'] },
      { code: '3252', name: 'Fabricación de resinas y hule sintético', pitch: 'Almacén industrial, distribución nacional', keywords: ['RESINAS', 'HULE', 'PLASTICOS', 'POLIMEROS'] },
      { code: '3254', name: 'Fabricación de productos farmacéuticos', pitch: 'Almacén controlado, frío, trazabilidad', keywords: ['FARMACEUTICA', 'LABORATORIO', 'MEDICAMENTOS', 'FARMACIA'] },
      { code: '3261', name: 'Fabricación de productos de plástico', pitch: 'Almacén industrial, distribución', keywords: ['PLASTICOS', 'ENVASES', 'EMPAQUES', 'INYECCION PLASTICO'] },
      { code: '3341', name: 'Fabricación de computadoras y periféricos', pitch: 'Almacén fiscal, importación Asia', keywords: ['COMPUTADORAS', 'TECNOLOGIA', 'ELECTRONICA', 'EQUIPOS COMPUTO'] },
      { code: '3342', name: 'Fabricación de equipos de comunicación', pitch: 'Almacén fiscal, importación', keywords: ['TELECOMUNICACIONES', 'EQUIPOS COMUNICACION', 'REDES'] },
      { code: '3344', name: 'Fabricación de semiconductores', pitch: 'Almacén especializado, alta seguridad', keywords: ['SEMICONDUCTORES', 'ELECTRONICA', 'COMPONENTES ELECTRONICOS'] },
      { code: '3351', name: 'Fabricación de accesorios de iluminación', pitch: 'Almacén, importación, distribución', keywords: ['ILUMINACION', 'LAMPARAS', 'LED', 'LUMINARIAS'] },
      { code: '3361', name: 'Fabricación de automóviles y camiones', pitch: 'JIT, cross-docking, partes automotrices', keywords: ['AUTOMOTRIZ', 'ARMADORA', 'VEHICULOS', 'AUTOPARTES'] },
      { code: '3362', name: 'Fabricación de carrocerías y remolques', pitch: 'Almacén industrial, distribución', keywords: ['CARROCERIA', 'REMOLQUES', 'TRAILERS', 'SEMIRREMOLQUES'] },
      { code: '3363', name: 'Fabricación de partes para vehículos', pitch: 'JIT, importación, almacén automotriz', keywords: ['AUTOPARTES', 'REFACCIONES', 'PARTES AUTOMOTRICES', 'MAQUILA AUTOMOTRIZ'] },
    ],
  },
  {
    code: '43',
    name: 'Comercio al por Mayor',
    icon: '📦',
    subsectors: [
      { code: '4311', name: 'Comercio al por mayor de abarrotes y alimentos', pitch: 'Almacén seco, distribución regional', keywords: ['ABARROTES', 'DISTRIBUIDORA ALIMENTOS', 'MAYORISTA ALIMENTOS'] },
      { code: '4312', name: 'Comercio al por mayor de bebidas', pitch: 'Almacén, distribución capilar', keywords: ['DISTRIBUIDORA BEBIDAS', 'MAYORISTA BEBIDAS', 'EMBOTELLADORA'] },
      { code: '4321', name: 'Comercio al por mayor de ropa y accesorios', pitch: 'Cross-docking, importación, distribución', keywords: ['DISTRIBUIDORA ROPA', 'MAYORISTA TEXTIL', 'IMPORTADORA ROPA'] },
      { code: '4322', name: 'Comercio al por mayor de calzado', pitch: 'Almacén, cross-docking, importación', keywords: ['DISTRIBUIDORA CALZADO', 'MAYORISTA CALZADO', 'IMPORTADORA CALZADO'] },
      { code: '4331', name: 'Comercio al por mayor de productos farmacéuticos', pitch: 'Almacén controlado, frío, trazabilidad', keywords: ['DISTRIBUIDORA FARMACEUTICA', 'MAYORISTA MEDICAMENTOS', 'DROGUERIA'] },
      { code: '4332', name: 'Comercio al por mayor de artículos de perfumería', pitch: 'Almacén seco, distribución nacional', keywords: ['DISTRIBUIDORA COSMETICOS', 'MAYORISTA PERFUMERIA', 'COSMETICA'] },
      { code: '4341', name: 'Comercio al por mayor de materias primas agropecuarias', pitch: 'Almacén a granel, distribución regional', keywords: ['AGROQUIMICA', 'INSUMOS AGRICOLAS', 'MATERIAS PRIMAS AGRO'] },
      { code: '4342', name: 'Comercio al por mayor de flores y plantas', pitch: 'Cadena de frío, distribución urgente', keywords: ['FLORES', 'PLANTAS', 'VIVERO', 'FLORERIA MAYORISTA'] },
      { code: '4351', name: 'Comercio al por mayor de maquinaria y equipo', pitch: 'Almacén industrial, importación', keywords: ['MAQUINARIA', 'EQUIPOS INDUSTRIALES', 'IMPORTADORA MAQUINARIA'] },
      { code: '4352', name: 'Comercio al por mayor de equipo de cómputo', pitch: 'Almacén fiscal, importación Asia', keywords: ['COMPUTACION', 'DISTRIBUIDOR TECNOLOGIA', 'EQUIPOS COMPUTO MAYOREO'] },
      { code: '4353', name: 'Comercio al por mayor de equipo médico', pitch: 'Almacén controlado, importación', keywords: ['EQUIPO MEDICO', 'INSTRUMENTAL MEDICO', 'DISTRIBUIDOR MEDICO'] },
      { code: '4361', name: 'Comercio al por mayor de materiales de construcción', pitch: 'Almacén a granel, distribución regional', keywords: ['MATERIALES CONSTRUCCION', 'FERRETERIA MAYORISTA', 'ACERO', 'CEMENTERA'] },
      { code: '4371', name: 'Comercio al por mayor de combustibles', pitch: 'Almacén especializado, normativa SENER', keywords: ['COMBUSTIBLES', 'GASOLINERA', 'LUBRICANTES', 'GASOLINA'] },
      { code: '4391', name: 'Comercio al por mayor de enseres domésticos', pitch: 'Almacén, e-commerce, última milla', keywords: ['ENSERES DOMESTICOS', 'ELECTRODOMESTICOS MAYOREO', 'LINEA BLANCA'] },
      { code: '4392', name: 'Comercio al por mayor de juguetes', pitch: 'Almacén, temporadas, importación', keywords: ['JUGUETES', 'JUGUETERIA MAYORISTA', 'IMPORTADORA JUGUETES'] },
      { code: '4399', name: 'Otros comercios al por mayor', pitch: 'Almacén flexible, distribución nacional', keywords: ['DISTRIBUIDORA', 'COMERCIALIZADORA', 'IMPORTADORA EXPORTADORA'] },
    ],
  },
  {
    code: '46',
    name: 'Comercio al por Menor',
    icon: '🛒',
    subsectors: [
      { code: '4611', name: 'Comercio al por menor de abarrotes y alimentos', pitch: 'Reabasto frecuente, última milla', keywords: ['SUPERMERCADO', 'TIENDA ABARROTES', 'MINISUPER'] },
      { code: '4621', name: 'Comercio al por menor de artículos de ferretería', pitch: 'Distribución regional, almacén', keywords: ['FERRETERIA', 'TLAPALERIA', 'MATERIALES'] },
      { code: '4631', name: 'Comercio al por menor de ropa y accesorios', pitch: 'Distribución a tiendas, e-commerce', keywords: ['BOUTIQUE', 'TIENDA ROPA', 'MODA', 'CONFECCIONES'] },
      { code: '4641', name: 'Comercio al por menor de artículos para el hogar', pitch: 'E-commerce, última milla, fulfillment', keywords: ['MUEBLES', 'DECORACION', 'HOGAR', 'LINEA BLANCA'] },
      { code: '4651', name: 'Comercio al por menor de electrónica', pitch: 'Almacén fiscal, fulfillment, e-commerce', keywords: ['ELECTRONICA', 'CELULARES', 'COMPUTO', 'GADGETS'] },
      { code: '4661', name: 'Comercio al por menor de artículos deportivos', pitch: 'Fulfillment, distribución nacional', keywords: ['DEPORTES', 'ARTICULOS DEPORTIVOS', 'GYM'] },
      { code: '4671', name: 'Comercio al por menor en tiendas de autoservicio', pitch: 'Abasto continuo, cross-docking', keywords: ['AUTOSERVICIO', 'CADENA TIENDAS', 'CONVENIENCIA'] },
    ],
  },
  {
    code: '49',
    name: 'Transporte y Logística',
    icon: '🚛',
    subsectors: [
      { code: '4921', name: 'Mensajería y paquetería', pitch: 'Alianza, última milla compartida', keywords: ['MENSAJERIA', 'PAQUETERIA', 'COURIER', 'ENVIOS'] },
      { code: '4922', name: 'Servicio de entrega de correo', pitch: 'Integración last-mile', keywords: ['CORREO', 'ENTREGA', 'POSTAL'] },
      { code: '4931', name: 'Almacenamiento y depósito', pitch: 'Coopetencia, capacidad compartida', keywords: ['ALMACENAJE', 'DEPOSITO', 'BODEGA', 'ALMACEN'] },
      { code: '4932', name: 'Refrigeración y almacenamiento en frío', pitch: 'Alianza o cliente de capacidad', keywords: ['CAMARA FRIA', 'REFRIGERACION', 'CONGELACION', 'CADENA FRIO'] },
    ],
  },
  {
    code: '52',
    name: 'Servicios Financieros e Importadores',
    icon: '🏦',
    subsectors: [
      { code: '5241', name: 'Instituciones de seguros', pitch: 'Logística de siniestros, almacén de recuperados', keywords: ['ASEGURADORA', 'SEGUROS', 'SINIESTROS'] },
      { code: '5251', name: 'Fondos y fideicomisos financieros', pitch: 'Garantías en almacén fiscal', keywords: ['FIDEICOMISO', 'FONDO INVERSION', 'FINANCIERA'] },
    ],
  },
  {
    code: '72',
    name: 'Hospitalidad y Alimentos',
    icon: '🏨',
    subsectors: [
      { code: '7211', name: 'Hoteles y similares', pitch: 'Abasto de suministros, almacén satélite', keywords: ['HOTEL', 'HOSTAL', 'RESORT', 'HOSPEDAJE'] },
      { code: '7221', name: 'Restaurantes y servicios de comida', pitch: 'Distribución de insumos, cadena de frío', keywords: ['RESTAURANTE', 'CADENA RESTAURANTES', 'FRANQUICIA COMIDA', 'CATERING'] },
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
