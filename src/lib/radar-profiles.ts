export interface SCIANSubsector {
  code: string
  name: string
  keywords: string[] // términos para buscar en BuscarEntidad de DENUE
}

export interface SCIANSector {
  code: string
  name: string
  icon: string
  subsectors: SCIANSubsector[]
}

// ─── Árbol SCIAN general (economía mexicana) ────────────────────────────────
// Agnóstico al giro: cubre los sectores principales para que el Radar sirva a
// prospección de cualquier cliente, no solo operadores logísticos. La selección
// específica por cliente se hace con "Sugerir sectores con IA" (analiza el
// diagnóstico del caso) o manualmente.

export const SCIAN_SECTORS: SCIANSector[] = [
  {
    code: '11',
    name: 'Agropecuario, silvicultura y pesca',
    icon: '🌾',
    subsectors: [
      { code: '1111', name: 'Agricultura y cultivo', keywords: ['AGRICOLA', 'CULTIVO', 'GRANJA', 'CEREALES', 'HORTALIZAS'] },
      { code: '1121', name: 'Ganadería y cría de animales', keywords: ['GANADERA', 'BOVINOS', 'PORCINOS', 'AVICOLA', 'RANCHO'] },
      { code: '1141', name: 'Pesca y acuicultura', keywords: ['PESCA', 'PESQUERA', 'ACUICOLA', 'MARISCOS'] },
      { code: '1151', name: 'Servicios para la agricultura', keywords: ['SERVICIOS AGRICOLAS', 'AGROPECUARIA', 'INVERNADERO'] },
    ],
  },
  {
    code: '21',
    name: 'Minería y extracción',
    icon: '⛏️',
    subsectors: [
      { code: '2111', name: 'Extracción de petróleo y gas', keywords: ['PETROLEO', 'GAS NATURAL', 'EXTRACCION'] },
      { code: '2122', name: 'Minería de minerales metálicos', keywords: ['MINERA', 'MINERALES', 'MINA', 'METALES'] },
      { code: '2123', name: 'Minería de minerales no metálicos', keywords: ['CANTERA', 'GRAVA', 'ARENA', 'CALIZA'] },
    ],
  },
  {
    code: '22',
    name: 'Energía, agua y gas',
    icon: '⚡',
    subsectors: [
      { code: '2211', name: 'Electricidad y energía', keywords: ['ELECTRICA', 'ENERGIA', 'GENERADORA', 'SOLAR', 'RENOVABLE'] },
      { code: '2221', name: 'Suministro y tratamiento de agua', keywords: ['AGUA', 'POTABLE', 'TRATAMIENTO AGUA', 'PURIFICADORA'] },
    ],
  },
  {
    code: '23',
    name: 'Construcción',
    icon: '🏗️',
    subsectors: [
      { code: '2361', name: 'Edificación residencial', keywords: ['CONSTRUCTORA', 'VIVIENDA', 'EDIFICACION', 'DESARROLLADORA'] },
      { code: '2362', name: 'Edificación no residencial', keywords: ['CONSTRUCTORA', 'OBRA', 'EDIFICIOS', 'NAVES INDUSTRIALES'] },
      { code: '2371', name: 'Obras de ingeniería civil', keywords: ['INGENIERIA CIVIL', 'OBRA CIVIL', 'INFRAESTRUCTURA', 'CARRETERAS'] },
      { code: '2381', name: 'Trabajos especializados de construcción', keywords: ['INSTALACIONES', 'ELECTRICOS', 'PLOMERIA', 'ACABADOS', 'IMPERMEABILIZACION'] },
    ],
  },
  {
    code: '31',
    name: 'Industria manufacturera',
    icon: '🏭',
    subsectors: [
      { code: '3111', name: 'Alimentos para animales', keywords: ['ALIMENTO BALANCEADO', 'ALIMENTOS ANIMALES', 'AGROPECUARIA'] },
      { code: '3115', name: 'Productos lácteos', keywords: ['LACTEOS', 'QUESOS', 'LECHERA', 'YOGURT'] },
      { code: '3116', name: 'Procesamiento de carne', keywords: ['CARNES', 'EMPACADORA', 'FRIGORIFICO', 'PROCESADORA CARNES'] },
      { code: '3118', name: 'Panadería y tortillas', keywords: ['PANIFICADORA', 'PANADERIA', 'TORTILLERIA', 'GALLETERA'] },
      { code: '3121', name: 'Bebidas', keywords: ['EMBOTELLADORA', 'BEBIDAS', 'REFRESCOS', 'CERVECERA', 'AGUA'] },
      { code: '3152', name: 'Prendas de vestir', keywords: ['CONFECCION', 'ROPA', 'MAQUILADORA', 'TEXTIL'] },
      { code: '3254', name: 'Productos farmacéuticos', keywords: ['FARMACEUTICA', 'LABORATORIO', 'MEDICAMENTOS'] },
      { code: '3261', name: 'Productos de plástico', keywords: ['PLASTICOS', 'ENVASES', 'EMPAQUES', 'INYECCION PLASTICO'] },
      { code: '3271', name: 'Vidrio, cerámica y minerales no metálicos', keywords: ['VIDRIO', 'CERAMICA', 'CEMENTO', 'CONCRETO'] },
      { code: '3311', name: 'Industria básica del hierro y acero', keywords: ['ACERO', 'METALURGICA', 'FUNDIDORA', 'HIERRO'] },
      { code: '3328', name: 'Maquinado y recubrimiento de metales', keywords: ['METALMECANICA', 'MAQUINADOS', 'TROQUELADOS', 'HERRERIA'] },
      { code: '3341', name: 'Computadoras y electrónica', keywords: ['ELECTRONICA', 'TECNOLOGIA', 'EQUIPOS COMPUTO', 'COMPONENTES'] },
      { code: '3361', name: 'Industria automotriz y autopartes', keywords: ['AUTOMOTRIZ', 'ARMADORA', 'AUTOPARTES', 'REFACCIONES'] },
      { code: '3371', name: 'Muebles', keywords: ['MUEBLES', 'MUEBLERA', 'CARPINTERIA', 'EBANISTERIA'] },
    ],
  },
  {
    code: '43',
    name: 'Comercio al por mayor',
    icon: '📦',
    subsectors: [
      { code: '4311', name: 'Abarrotes y alimentos al mayoreo', keywords: ['ABARROTES', 'DISTRIBUIDORA ALIMENTOS', 'MAYORISTA'] },
      { code: '4331', name: 'Productos farmacéuticos al mayoreo', keywords: ['DISTRIBUIDORA FARMACEUTICA', 'MEDICAMENTOS MAYOREO', 'DROGUERIA'] },
      { code: '4341', name: 'Materias primas agropecuarias', keywords: ['INSUMOS AGRICOLAS', 'AGROQUIMICA', 'FERTILIZANTES'] },
      { code: '4351', name: 'Maquinaria y equipo', keywords: ['MAQUINARIA', 'EQUIPOS INDUSTRIALES', 'IMPORTADORA MAQUINARIA'] },
      { code: '4352', name: 'Equipo de cómputo y tecnología', keywords: ['DISTRIBUIDOR TECNOLOGIA', 'COMPUTO MAYOREO', 'TELECOMUNICACIONES'] },
      { code: '4361', name: 'Materiales de construcción', keywords: ['MATERIALES CONSTRUCCION', 'FERRETERIA MAYORISTA', 'ACERO', 'CEMENTERA'] },
      { code: '4371', name: 'Combustibles y lubricantes', keywords: ['COMBUSTIBLES', 'LUBRICANTES', 'DIESEL'] },
    ],
  },
  {
    code: '46',
    name: 'Comercio al por menor',
    icon: '🛒',
    subsectors: [
      { code: '4611', name: 'Abarrotes y supermercados', keywords: ['SUPERMERCADO', 'ABARROTES', 'MINISUPER'] },
      { code: '4631', name: 'Ropa, calzado y accesorios', keywords: ['BOUTIQUE', 'TIENDA ROPA', 'ZAPATERIA', 'MODA'] },
      { code: '4641', name: 'Artículos para el hogar', keywords: ['MUEBLES', 'DECORACION', 'HOGAR', 'LINEA BLANCA'] },
      { code: '4651', name: 'Electrónica y celulares', keywords: ['ELECTRONICA', 'CELULARES', 'COMPUTO', 'GADGETS'] },
      { code: '4661', name: 'Papelería, libros y artículos varios', keywords: ['PAPELERIA', 'LIBRERIA', 'ARTICULOS OFICINA'] },
      { code: '4671', name: 'Tiendas de autoservicio y conveniencia', keywords: ['AUTOSERVICIO', 'CONVENIENCIA', 'CADENA TIENDAS'] },
      { code: '4681', name: 'Gasolineras', keywords: ['GASOLINERA', 'ESTACION SERVICIO', 'COMBUSTIBLE'] },
    ],
  },
  {
    code: '48',
    name: 'Transporte y logística',
    icon: '🚛',
    subsectors: [
      { code: '4841', name: 'Autotransporte de carga', keywords: ['TRANSPORTES', 'AUTOTRANSPORTE', 'FLETES', 'LOGISTICA'] },
      { code: '4921', name: 'Mensajería y paquetería', keywords: ['MENSAJERIA', 'PAQUETERIA', 'COURIER', 'ENVIOS'] },
      { code: '4931', name: 'Almacenamiento y depósito', keywords: ['ALMACENAJE', 'BODEGA', 'ALMACEN', 'DEPOSITO'] },
    ],
  },
  {
    code: '51',
    name: 'Información y tecnología',
    icon: '💻',
    subsectors: [
      { code: '5112', name: 'Software y desarrollo de sistemas', keywords: ['SOFTWARE', 'DESARROLLO', 'SISTEMAS', 'TECNOLOGIA'] },
      { code: '5161', name: 'Servicios de internet y web', keywords: ['INTERNET', 'DIGITAL', 'WEB', 'ECOMMERCE'] },
      { code: '5182', name: 'Procesamiento de datos y hosting', keywords: ['DATOS', 'HOSTING', 'DATACENTER', 'NUBE'] },
      { code: '5151', name: 'Medios, radio y televisión', keywords: ['RADIO', 'TELEVISION', 'MEDIOS', 'PRODUCTORA'] },
    ],
  },
  {
    code: '52',
    name: 'Servicios financieros y seguros',
    icon: '🏦',
    subsectors: [
      { code: '5221', name: 'Banca y crédito', keywords: ['BANCO', 'BANCA', 'CREDITO'] },
      { code: '5223', name: 'Financieras y SOFOMes', keywords: ['FINANCIERA', 'SOFOM', 'PRESTAMOS', 'CREDITO'] },
      { code: '5241', name: 'Seguros y fianzas', keywords: ['ASEGURADORA', 'SEGUROS', 'FIANZAS'] },
      { code: '5239', name: 'Inversión y casas de bolsa', keywords: ['CASA BOLSA', 'INVERSION', 'FONDOS', 'FINANCIERA'] },
    ],
  },
  {
    code: '53',
    name: 'Inmobiliario y alquiler',
    icon: '🏢',
    subsectors: [
      { code: '5311', name: 'Bienes raíces e inmobiliarias', keywords: ['INMOBILIARIA', 'BIENES RAICES', 'ARRENDAMIENTO INMUEBLES'] },
      { code: '5321', name: 'Renta de automóviles', keywords: ['RENTA AUTOS', 'ARRENDADORA VEHICULOS'] },
      { code: '5324', name: 'Renta de maquinaria y equipo', keywords: ['RENTA MAQUINARIA', 'ARRENDAMIENTO EQUIPO'] },
    ],
  },
  {
    code: '54',
    name: 'Servicios profesionales',
    icon: '💼',
    subsectors: [
      { code: '5411', name: 'Servicios legales y notariales', keywords: ['ABOGADOS', 'JURIDICO', 'DESPACHO LEGAL', 'NOTARIA'] },
      { code: '5412', name: 'Contabilidad y auditoría', keywords: ['CONTADORES', 'CONTABILIDAD', 'AUDITORIA', 'DESPACHO CONTABLE'] },
      { code: '5413', name: 'Arquitectura e ingeniería', keywords: ['ARQUITECTOS', 'INGENIERIA', 'PROYECTOS'] },
      { code: '5416', name: 'Consultoría administrativa', keywords: ['CONSULTORIA', 'CONSULTORES', 'ASESORIA EMPRESARIAL'] },
      { code: '5418', name: 'Publicidad y marketing', keywords: ['PUBLICIDAD', 'MARKETING', 'AGENCIA', 'MERCADOTECNIA'] },
    ],
  },
  {
    code: '56',
    name: 'Apoyo a los negocios',
    icon: '🧰',
    subsectors: [
      { code: '5613', name: 'Reclutamiento y recursos humanos', keywords: ['AGENCIA EMPLEO', 'RECLUTAMIENTO', 'RECURSOS HUMANOS', 'OUTSOURCING'] },
      { code: '5616', name: 'Seguridad privada', keywords: ['SEGURIDAD PRIVADA', 'VIGILANCIA', 'GUARDIAS'] },
      { code: '5617', name: 'Limpieza y mantenimiento', keywords: ['LIMPIEZA', 'MANTENIMIENTO', 'INTENDENCIA', 'FUMIGACION'] },
      { code: '5621', name: 'Manejo de residuos y reciclaje', keywords: ['RESIDUOS', 'RECICLAJE', 'DESECHOS', 'RECOLECCION'] },
    ],
  },
  {
    code: '61',
    name: 'Servicios educativos',
    icon: '🎓',
    subsectors: [
      { code: '6111', name: 'Escuelas y colegios', keywords: ['ESCUELA', 'COLEGIO', 'INSTITUTO', 'KINDER'] },
      { code: '6113', name: 'Educación superior', keywords: ['UNIVERSIDAD', 'EDUCACION SUPERIOR', 'TECNOLOGICO'] },
      { code: '6116', name: 'Capacitación y academias', keywords: ['CAPACITACION', 'CURSOS', 'ACADEMIA', 'ENTRENAMIENTO'] },
    ],
  },
  {
    code: '62',
    name: 'Salud y asistencia social',
    icon: '🏥',
    subsectors: [
      { code: '6211', name: 'Consultorios y clínicas', keywords: ['CONSULTORIO', 'CLINICA', 'MEDICO', 'DENTAL'] },
      { code: '6215', name: 'Laboratorios clínicos', keywords: ['LABORATORIO CLINICO', 'ANALISIS CLINICOS'] },
      { code: '6221', name: 'Hospitales', keywords: ['HOSPITAL', 'SANATORIO'] },
      { code: '6244', name: 'Guarderías y asistencia social', keywords: ['GUARDERIA', 'ASISTENCIA SOCIAL', 'ESTANCIA INFANTIL'] },
    ],
  },
  {
    code: '71',
    name: 'Esparcimiento, cultura y deporte',
    icon: '🎭',
    subsectors: [
      { code: '7131', name: 'Parques y centros recreativos', keywords: ['PARQUE', 'RECREATIVO', 'ENTRETENIMIENTO', 'EVENTOS'] },
      { code: '7139', name: 'Gimnasios y deporte', keywords: ['GIMNASIO', 'DEPORTIVO', 'GYM', 'CLUB'] },
    ],
  },
  {
    code: '72',
    name: 'Hospitalidad y alimentos',
    icon: '🏨',
    subsectors: [
      { code: '7211', name: 'Hoteles y hospedaje', keywords: ['HOTEL', 'RESORT', 'HOSPEDAJE', 'MOTEL'] },
      { code: '7223', name: 'Catering y banquetes', keywords: ['CATERING', 'BANQUETES', 'COMEDORES INDUSTRIALES'] },
      { code: '7225', name: 'Restaurantes y cafeterías', keywords: ['RESTAURANTE', 'CAFETERIA', 'FONDA', 'FRANQUICIA COMIDA'] },
    ],
  },
  {
    code: '81',
    name: 'Otros servicios',
    icon: '🔧',
    subsectors: [
      { code: '8111', name: 'Reparación de automóviles', keywords: ['TALLER', 'REPARACION AUTOS', 'HOJALATERIA', 'REFACCIONARIA'] },
      { code: '8112', name: 'Reparación de equipo y electrónica', keywords: ['REPARACION', 'SERVICIO TECNICO', 'MANTENIMIENTO EQUIPO'] },
      { code: '8121', name: 'Servicios personales y estética', keywords: ['ESTETICA', 'SALON BELLEZA', 'SPA', 'BARBERIA'] },
    ],
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getSectorByCode(code: string): SCIANSector | undefined {
  return SCIAN_SECTORS.find(s => s.code === code)
}

export function getSubsectorByCode(code: string): SCIANSubsector | undefined {
  for (const sector of SCIAN_SECTORS) {
    const sub = sector.subsectors.find(s => s.code === code)
    if (sub) return sub
  }
}
