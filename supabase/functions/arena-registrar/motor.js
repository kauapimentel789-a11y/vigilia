var HABILIDADES = Object.fromEntries([
	{
		id: "corteRapido",
		nome: "Corte Rápido",
		descricao: "Um corte veloz: 120% do ataque no alvo.",
		categoria: "ataque",
		desbloqueio: 1,
		recarga: 3,
		efeitos: [{
			tipo: "dano",
			mult: 1.2,
			alvo: "alvo"
		}]
	},
	{
		id: "guardaCinzenta",
		nome: "Guarda Cinzenta",
		descricao: "Ergue a guarda: bloqueio igual a 30% da vida máxima.",
		categoria: "defesa",
		desbloqueio: 1,
		recarga: 8,
		efeitos: [{
			tipo: "bloqueio",
			pctVidaMax: .3,
			alvo: "proprio"
		}]
	},
	{
		id: "laminaVenenosa",
		nome: "Lâmina Venenosa",
		descricao: "80% do ataque e 4 de Veneno no alvo.",
		categoria: "ataque",
		desbloqueio: 3,
		recarga: 6,
		efeitos: [{
			tipo: "dano",
			mult: .8,
			alvo: "alvo"
		}, {
			tipo: "status",
			status: "veneno",
			valor: 4,
			alvo: "alvo"
		}]
	},
	{
		id: "golpeRasgante",
		nome: "Golpe Rasgante",
		descricao: "90% do ataque em todos os inimigos.",
		categoria: "ataque",
		desbloqueio: 6,
		recarga: 10,
		efeitos: [{
			tipo: "dano",
			mult: .9,
			alvo: "inimigos"
		}]
	},
	{
		id: "folegoDaVigilia",
		nome: "Fôlego da Vigília",
		descricao: "Cura 25% da vida máxima e remove Fraco.",
		categoria: "cura",
		desbloqueio: 10,
		recarga: 14,
		efeitos: [{
			tipo: "cura",
			pctVidaMax: .25,
			alvo: "proprio"
		}, {
			tipo: "limpar",
			status: "fraco",
			alvo: "proprio"
		}]
	},
	{
		id: "marcaDoCacador",
		nome: "Marca do Caçador",
		descricao: "Deixa o alvo Vulnerável por 4 s e causa 150% do ataque.",
		categoria: "ataque",
		desbloqueio: 15,
		recarga: 12,
		efeitos: [{
			tipo: "status",
			status: "vulneravel",
			valor: 4,
			alvo: "alvo"
		}, {
			tipo: "dano",
			mult: 1.5,
			alvo: "alvo"
		}]
	},
	{
		id: "laminaDaBrasa",
		nome: "Lâmina da Brasa",
		descricao: "140% do ataque e 5 de Queimadura no alvo.",
		categoria: "ataque",
		desbloqueio: 18,
		recarga: 7,
		efeitos: [{
			tipo: "dano",
			mult: 1.4,
			alvo: "alvo"
		}, {
			tipo: "status",
			status: "queimadura",
			valor: 5,
			alvo: "alvo"
		}]
	},
	{
		id: "baluarte",
		nome: "Baluarte da Vigília",
		descricao: "Bloqueio igual a 45% da vida máxima e apaga a Queimadura.",
		categoria: "defesa",
		desbloqueio: 22,
		recarga: 16,
		efeitos: [{
			tipo: "bloqueio",
			pctVidaMax: .45,
			alvo: "proprio"
		}, {
			tipo: "limpar",
			status: "queimadura",
			alvo: "proprio"
		}]
	},
	{
		id: "tormentaDeCinzas",
		nome: "Tormenta de Cinzas",
		descricao: "Dois golpes de 80% do ataque em todos os inimigos em volta.",
		categoria: "ataque",
		desbloqueio: 26,
		recarga: 14,
		efeitos: [{
			tipo: "dano",
			mult: .8,
			golpes: 2,
			alvo: "inimigos"
		}]
	}
].map((h) => [h.id, h]));
var ARENA = {
	unidades: Object.fromEntries([
		{
			id: "vigiaDeCinza",
			nome: "Vigia de Cinza",
			custo: 1,
			marcas: ["cinzas", "ossos"],
			vida: 620,
			ataque: 40,
			velocidade: 80,
			alcance: 1,
			habilidade: {
				nome: "Escudo de Cinza",
				descricao: "Ganha bloqueio igual a 30% da vida máxima.",
				efeitos: [{
					tipo: "bloqueio",
					pctVidaMax: .3,
					alvo: "proprio"
				}]
			}
		},
		{
			id: "ratoDeBrasa",
			nome: "Rato de Brasa",
			custo: 1,
			marcas: ["chama", "veu"],
			vida: 420,
			ataque: 46,
			velocidade: 120,
			alcance: 1,
			habilidade: {
				nome: "Mordida Ardente",
				descricao: "150% do ataque e 6 de Queimadura no alvo.",
				efeitos: [{
					tipo: "dano",
					mult: 1.5,
					alvo: "alvo"
				}, {
					tipo: "status",
					status: "queimadura",
					valor: 6,
					alvo: "alvo"
				}]
			}
		},
		{
			id: "acolitaPalida",
			nome: "Acólita Pálida",
			custo: 1,
			marcas: ["abismo", "veu"],
			vida: 420,
			ataque: 34,
			velocidade: 90,
			alcance: 3,
			habilidade: {
				nome: "Prece Fria",
				descricao: "Cura 25% da vida máxima do aliado mais ferido.",
				efeitos: [{
					tipo: "cura",
					pctVidaMax: .25,
					alvo: "aliadoMaisFerido"
				}]
			}
		},
		{
			id: "arqueiroOco",
			nome: "Arqueiro Oco",
			custo: 1,
			marcas: ["ossos", "veu"],
			vida: 400,
			ataque: 50,
			velocidade: 85,
			alcance: 3,
			habilidade: {
				nome: "Tiro Certeiro",
				descricao: "240% do ataque no alvo.",
				efeitos: [{
					tipo: "dano",
					mult: 2.4,
					alvo: "alvo"
				}]
			}
		},
		{
			id: "carnical",
			nome: "Carniçal",
			custo: 1,
			marcas: ["abismo", "ossos"],
			vida: 580,
			ataque: 42,
			velocidade: 80,
			alcance: 1,
			habilidade: {
				nome: "Devorar",
				descricao: "150% do ataque no alvo e cura 15% da própria vida.",
				efeitos: [{
					tipo: "dano",
					mult: 1.5,
					alvo: "alvo"
				}, {
					tipo: "cura",
					pctVidaMax: .15,
					alvo: "proprio"
				}]
			}
		},
		{
			id: "fagulha",
			nome: "Fagulha",
			custo: 1,
			marcas: ["chama", "cinzas"],
			vida: 380,
			ataque: 40,
			velocidade: 95,
			alcance: 3,
			habilidade: {
				nome: "Chuva de Fagulhas",
				descricao: "60% do ataque em todos os inimigos.",
				efeitos: [{
					tipo: "dano",
					mult: .6,
					alvo: "inimigos"
				}]
			}
		},
		{
			id: "ferreiro",
			nome: "Ferreiro Cinzento",
			custo: 2,
			marcas: ["cinzas", "chama"],
			vida: 800,
			ataque: 56,
			velocidade: 70,
			alcance: 1,
			habilidade: {
				nome: "Malho",
				descricao: "220% do ataque e deixa o alvo Fraco por 4 s.",
				efeitos: [{
					tipo: "dano",
					mult: 2.2,
					alvo: "alvo"
				}, {
					tipo: "status",
					status: "fraco",
					valor: 4,
					alvo: "alvo"
				}]
			}
		},
		{
			id: "tecela",
			nome: "Tecelã",
			custo: 2,
			marcas: ["veu", "abismo"],
			vida: 520,
			ataque: 46,
			velocidade: 85,
			alcance: 3,
			habilidade: {
				nome: "Teia Pálida",
				descricao: "8 de Veneno e 3 s de Fraco no alvo.",
				efeitos: [{
					tipo: "status",
					status: "veneno",
					valor: 8,
					alvo: "alvo"
				}, {
					tipo: "status",
					status: "fraco",
					valor: 3,
					alvo: "alvo"
				}]
			}
		},
		{
			id: "sentinela",
			nome: "Sentinela de Osso",
			custo: 2,
			marcas: ["ossos", "cinzas"],
			vida: 860,
			ataque: 40,
			velocidade: 70,
			alcance: 1,
			habilidade: {
				nome: "Proteger",
				descricao: "Dá ao aliado mais ferido bloqueio igual a 25% da vida máxima da Sentinela.",
				efeitos: [{
					tipo: "bloqueio",
					pctVidaMax: .25,
					alvo: "aliadoMaisFerido"
				}]
			}
		},
		{
			id: "caoDeEscoria",
			nome: "Cão de Escória",
			custo: 2,
			marcas: ["abismo", "chama"],
			vida: 560,
			ataque: 60,
			velocidade: 120,
			alcance: 1,
			habilidade: {
				nome: "Marcar a Presa",
				descricao: "120% do ataque e 6 de Marca no alvo.",
				efeitos: [{
					tipo: "dano",
					mult: 1.2,
					alvo: "alvo"
				}, {
					tipo: "status",
					status: "marca",
					valor: 6,
					alvo: "alvo"
				}]
			}
		},
		{
			id: "lancadora",
			nome: "Lançadora de Brasas",
			custo: 2,
			marcas: ["chama", "veu"],
			vida: 500,
			ataque: 56,
			velocidade: 85,
			alcance: 3,
			habilidade: {
				nome: "Bola de Fogo",
				descricao: "180% do ataque e 6 de Queimadura no alvo.",
				efeitos: [{
					tipo: "dano",
					mult: 1.8,
					alvo: "alvo"
				}, {
					tipo: "status",
					status: "queimadura",
					valor: 6,
					alvo: "alvo"
				}]
			}
		},
		{
			id: "cavaleiroOco",
			nome: "Cavaleiro Oco",
			custo: 3,
			marcas: ["ossos", "abismo"],
			vida: 1050,
			ataque: 70,
			velocidade: 70,
			alcance: 1,
			habilidade: {
				nome: "Execução",
				descricao: "320% do ataque no alvo.",
				efeitos: [{
					tipo: "dano",
					mult: 3.2,
					alvo: "alvo"
				}]
			}
		},
		{
			id: "guardiaLimiar",
			nome: "Guardiã do Limiar",
			custo: 3,
			marcas: ["cinzas", "veu"],
			vida: 980,
			ataque: 64,
			velocidade: 75,
			alcance: 1,
			habilidade: {
				nome: "Varrer o Limiar",
				descricao: "90% do ataque em todos os inimigos e bloqueio de 15% da vida.",
				efeitos: [{
					tipo: "dano",
					mult: .9,
					alvo: "inimigos"
				}, {
					tipo: "bloqueio",
					pctVidaMax: .15,
					alvo: "proprio"
				}]
			}
		},
		{
			id: "arauto",
			nome: "Arauto da Brasa",
			custo: 3,
			marcas: ["chama", "abismo"],
			vida: 820,
			ataque: 74,
			velocidade: 80,
			alcance: 2,
			habilidade: {
				nome: "Explosão de Brasa",
				descricao: "100% do ataque e 4 de Queimadura em todos os inimigos.",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "inimigos"
				}, {
					tipo: "status",
					status: "queimadura",
					valor: 4,
					alvo: "inimigos"
				}]
			}
		},
		{
			id: "caldeira",
			nome: "Olho da Caldeira",
			custo: 3,
			marcas: ["veu", "chama"],
			vida: 720,
			ataque: 62,
			velocidade: 70,
			alcance: 4,
			habilidade: {
				nome: "Anel de Fogo",
				descricao: "90% do ataque em todos os inimigos e 3 s de Vulnerável.",
				efeitos: [{
					tipo: "dano",
					mult: .9,
					alvo: "inimigos"
				}, {
					tipo: "status",
					status: "vulneravel",
					valor: 3,
					alvo: "inimigos"
				}]
			}
		}
	].map((u) => [u.id, u])),
	marcas: Object.fromEntries([
		{
			id: "cinzas",
			nome: "Cinzas",
			descricao: "Começam a luta com bloqueio.",
			niveis: [{
				qtd: 2,
				texto: "Todos: bloqueio de 15% da vida",
				bonus: { bloqueioPct: .15 }
			}, {
				qtd: 4,
				texto: "Todos: bloqueio de 35% da vida",
				bonus: { bloqueioPct: .35 }
			}]
		},
		{
			id: "ossos",
			nome: "Ossos",
			descricao: "Mais vida.",
			niveis: [{
				qtd: 2,
				texto: "Todos: +15% de vida",
				bonus: { vidaPct: .15 }
			}, {
				qtd: 4,
				texto: "Todos: +35% de vida",
				bonus: { vidaPct: .35 }
			}]
		},
		{
			id: "veu",
			nome: "Véu",
			descricao: "Golpes críticos.",
			niveis: [{
				qtd: 2,
				texto: "Todos: +15% de crítico",
				bonus: { critico: .15 }
			}, {
				qtd: 4,
				texto: "Todos: +30% de crítico e +30% de dano crítico",
				bonus: {
					critico: .3,
					danoCritico: .3
				}
			}]
		},
		{
			id: "chama",
			nome: "Chama",
			descricao: "Ataques básicos queimam.",
			niveis: [{
				qtd: 2,
				texto: "Todos: ataques aplicam 2 de Queimadura",
				bonus: { queimaduraAoAcertar: 2 }
			}, {
				qtd: 4,
				texto: "Todos: ataques aplicam 5 de Queimadura",
				bonus: { queimaduraAoAcertar: 5 }
			}]
		},
		{
			id: "abismo",
			nome: "Abismo",
			descricao: "Roubo de vida e habilidades mais cedo.",
			niveis: [{
				qtd: 2,
				texto: "Todos: 10% de roubo de vida",
				bonus: { rouboVida: .1 }
			}, {
				qtd: 4,
				texto: "Todos: 25% de roubo de vida e começam com 40 de mana",
				bonus: {
					rouboVida: .25,
					manaInicial: 40
				}
			}]
		}
	].map((m) => [m.id, m])),
	herois: Object.fromEntries([
		{
			id: "vigia",
			nome: "Vigia",
			descricao: "Começa a partida com 3 de ouro a mais.",
			efeito: { ouroInicial: 3 }
		},
		{
			id: "juramento",
			nome: "Juramento",
			descricao: "Unidades da frente começam com bloqueio de 15% da vida.",
			selo: "seloCavaleiro",
			efeito: { bonusFrente: { bloqueioPct: .15 } }
		},
		{
			id: "limiar",
			nome: "Limiar",
			descricao: "Uma rolagem da loja grátis a cada rodada.",
			selo: "seloLimiar",
			efeito: { rolagemGratis: 1 }
		},
		{
			id: "matilha",
			nome: "Matilha",
			descricao: "+1 de XP a cada rodada.",
			selo: "seloMatilheiro",
			efeito: { xpExtra: 1 }
		},
		{
			id: "forja",
			nome: "Forja",
			descricao: "Todas as unidades com +8% de ataque.",
			selo: "seloForjadora",
			efeito: { bonus: { ataquePct: .08 } }
		},
		{
			id: "caldeira",
			nome: "Caldeira",
			descricao: "Ataques de todas as unidades aplicam 1 de Queimadura.",
			selo: "seloCaldeira",
			efeito: { bonus: { queimaduraAoAcertar: 1 } }
		},
		{
			id: "colosso",
			nome: "Colosso",
			descricao: "Todas as unidades com +8% de vida.",
			selo: "seloColosso",
			efeito: { bonus: { vidaPct: .08 } }
		},
		{
			id: "arauto",
			nome: "Arauto",
			descricao: "Começa a partida com 6 de vida a mais.",
			selo: "seloArauto",
			efeito: { vidaJogador: 6 }
		}
	].map((h) => [h.id, h])),
	regras: {
		jogadores: 4,
		vidaJogador: 40,
		rodadasMax: 20,
		banco: 8,
		colunas: 4,
		custoRolar: 2,
		custoXp: 4,
		xpPorCompra: 4,
		xpPorRodada: 2,
		xpParaNivel: [
			2,
			4,
			6,
			10,
			20,
			30,
			40
		],
		nivelMax: 8,
		nivelInicial: 2,
		renda: [
			3,
			4,
			5
		],
		jurosCada: 10,
		jurosMax: 3,
		bonusVitoria: 1,
		copias: [
			18,
			13,
			9
		],
		chances: [
			[
				100,
				0,
				0
			],
			[
				100,
				0,
				0
			],
			[
				75,
				25,
				0
			],
			[
				55,
				35,
				10
			],
			[
				45,
				40,
				15
			],
			[
				35,
				40,
				25
			],
			[
				25,
				40,
				35
			],
			[
				20,
				35,
				45
			]
		],
		tamanhoLoja: 5,
		multEstrela: [
			1,
			1.8,
			3.2
		],
		limiteS: 30,
		manaMax: 100,
		manaPorAtaque: 12,
		manaPorDano: 4,
		danoBase: 1,
		gloria: [
			30,
			18,
			10,
			5
		]
	},
	ofertas: {
		pocao: { custo: 6 },
		ouro: {
			custo: 10,
			porLevel: 40
		}
	},
	nomesBots: [
		"Sombra de Aldren",
		"Irmã Vesper",
		"O Andarilho",
		"Mão Cinzenta",
		"Corvo Pálido"
	]
};
var INIMIGOS = Object.fromEntries([
	{
		id: "carnical",
		xp: 6,
		ouro: 2,
		passoMs: 450,
		nome: "Carniçal Faminto",
		descricao: "Lento e insistente. A cada três ataques, rasga com força.",
		vidaMax: 60,
		ataque: 6,
		velocidade: 80,
		padrao: "ciclo",
		acoes: [
			{
				id: "morder",
				nome: "Morder",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}]
			},
			{
				id: "morder2",
				nome: "Morder",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}]
			},
			{
				id: "rasgar",
				nome: "Rasgar",
				efeitos: [{
					tipo: "dano",
					mult: 1.6,
					alvo: "alvo"
				}]
			}
		]
	},
	{
		id: "ratoDeCinza",
		xp: 3,
		ouro: 1,
		passoMs: 260,
		nome: "Rato de Cinza",
		descricao: "Pouca vida, muito rápido. Vem em bando.",
		vidaMax: 24,
		ataque: 3,
		velocidade: 160,
		padrao: "ciclo",
		acoes: [{
			id: "mordiscar",
			nome: "Mordiscar",
			efeitos: [{
				tipo: "dano",
				mult: 1,
				alvo: "alvo"
			}]
		}]
	},
	{
		id: "tecela",
		xp: 7,
		ouro: 3,
		alcance: 3,
		passoMs: 520,
		nome: "Tecelã Pálida",
		descricao: "Envenena e enfraquece. Mate-a antes que o veneno acumule.",
		vidaMax: 50,
		ataque: 4,
		velocidade: 70,
		padrao: "ciclo",
		acoes: [{
			id: "picada",
			nome: "Picada",
			efeitos: [{
				tipo: "dano",
				mult: 1,
				alvo: "alvo"
			}, {
				tipo: "status",
				status: "veneno",
				valor: 3,
				alvo: "alvo"
			}]
		}, {
			id: "teia",
			nome: "Teia",
			efeitos: [{
				tipo: "status",
				status: "fraco",
				valor: 4,
				alvo: "alvo"
			}]
		}]
	},
	{
		id: "sentinela",
		xp: 8,
		ouro: 3,
		passoMs: 560,
		nome: "Sentinela de Osso",
		descricao: "Protege o aliado mais ferido com bloqueio. Sozinha, só golpeia.",
		vidaMax: 80,
		ataque: 4,
		velocidade: 60,
		padrao: "ciclo",
		acoes: [{
			id: "proteger",
			nome: "Proteger",
			requerAliados: true,
			efeitos: [{
				tipo: "bloqueio",
				valor: 14,
				alvo: "aliadoMaisFerido"
			}]
		}, {
			id: "golpeDeOsso",
			nome: "Golpe de Osso",
			efeitos: [{
				tipo: "dano",
				mult: 1,
				alvo: "alvo"
			}]
		}]
	},
	{
		id: "arqueiro",
		xp: 9,
		ouro: 4,
		alcance: 4,
		passoMs: 460,
		nome: "Arqueiro Oco",
		descricao: "Fica atrás e mira. O Tiro Certeiro dói muito.",
		vidaMax: 34,
		ataque: 8,
		velocidade: 70,
		padrao: "ciclo",
		acoes: [
			{
				id: "flecha",
				nome: "Flecha",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}]
			},
			{
				id: "flecha2",
				nome: "Flecha",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}]
			},
			{
				id: "tiroCerteiro",
				nome: "Tiro Certeiro",
				forte: true,
				efeitos: [{
					tipo: "dano",
					mult: 2.4,
					alvo: "alvo"
				}]
			}
		]
	},
	{
		id: "cavaleiro",
		xp: 150,
		ouro: 80,
		passoMs: 520,
		nome: "Cavaleiro Oco",
		descricao: "Mini-chefe. Anuncia a Execução antes de usá-la. Abaixo de 50% de vida, entra em fúria.",
		vidaMax: 520,
		ataque: 10,
		velocidade: 55,
		padrao: "ciclo",
		acoes: [
			{
				id: "golpePesado",
				nome: "Golpe Pesado",
				efeitos: [{
					tipo: "dano",
					mult: 1.4,
					alvo: "alvo"
				}]
			},
			{
				id: "varredura",
				nome: "Varredura",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}]
			},
			{
				id: "execucao",
				nome: "Execução",
				forte: true,
				area: 1,
				efeitos: [{
					tipo: "dano",
					mult: 3.2,
					alvo: "alvo"
				}]
			}
		],
		especial: {
			abaixoDe: .5,
			anuncio: "O Cavaleiro Oco entra em fúria! (+4 de Força)",
			efeitos: [{
				tipo: "status",
				status: "forca",
				valor: 4,
				alvo: "proprio"
			}]
		}
	},
	{
		id: "centelha",
		xp: 3,
		ouro: 1,
		passoMs: 240,
		nome: "Centelha Errante",
		descricao: "Uma fagulha viva. Fraca, rápida e queima.",
		vidaMax: 22,
		ataque: 4,
		velocidade: 150,
		padrao: "ciclo",
		acoes: [{
			id: "faisca",
			nome: "Faísca",
			efeitos: [{
				tipo: "dano",
				mult: 1,
				alvo: "alvo"
			}, {
				tipo: "status",
				status: "queimadura",
				valor: 1,
				alvo: "alvo"
			}]
		}]
	},
	{
		id: "caoDeEscoria",
		xp: 6,
		ouro: 2,
		passoMs: 300,
		nome: "Cão de Escória",
		descricao: "Caça em matilha. A mordida marca a presa para os outros.",
		vidaMax: 46,
		ataque: 5,
		velocidade: 115,
		padrao: "ciclo",
		acoes: [
			{
				id: "morder",
				nome: "Morder",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}]
			},
			{
				id: "morder2",
				nome: "Morder",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}]
			},
			{
				id: "farejar",
				nome: "Marcar a Presa",
				efeitos: [{
					tipo: "dano",
					mult: .8,
					alvo: "alvo"
				}, {
					tipo: "status",
					status: "marca",
					valor: 3,
					alvo: "alvo"
				}]
			}
		]
	},
	{
		id: "ferreiro",
		xp: 11,
		ouro: 4,
		passoMs: 560,
		nome: "Ferreiro Cinzento",
		descricao: "Lento e pesado. Ergue o Malho e acerta a área marcada.",
		vidaMax: 110,
		ataque: 8,
		velocidade: 55,
		padrao: "ciclo",
		acoes: [
			{
				id: "martelada",
				nome: "Martelada",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}]
			},
			{
				id: "martelada2",
				nome: "Martelada",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}]
			},
			{
				id: "malho",
				nome: "Malho",
				forte: true,
				area: 1,
				efeitos: [{
					tipo: "dano",
					mult: 2.4,
					alvo: "alvo"
				}]
			}
		]
	},
	{
		id: "lancadora",
		xp: 9,
		ouro: 4,
		alcance: 4,
		passoMs: 480,
		nome: "Lançadora de Brasas",
		descricao: "Atira brasas de longe. A queimadura acumula.",
		vidaMax: 44,
		ataque: 6,
		velocidade: 70,
		padrao: "ciclo",
		acoes: [
			{
				id: "brasa",
				nome: "Brasa",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}, {
					tipo: "status",
					status: "queimadura",
					valor: 3,
					alvo: "alvo"
				}]
			},
			{
				id: "brasa2",
				nome: "Brasa",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}]
			},
			{
				id: "chuvaDeFagulhas",
				nome: "Chuva de Fagulhas",
				forte: true,
				area: 1,
				efeitos: [{
					tipo: "dano",
					mult: 1.8,
					alvo: "alvo"
				}, {
					tipo: "status",
					status: "queimadura",
					valor: 4,
					alvo: "alvo"
				}]
			}
		]
	},
	{
		id: "escudeiro",
		xp: 9,
		ouro: 3,
		passoMs: 540,
		nome: "Escudeiro de Ferro",
		descricao: "Protege o aliado mais ferido. O empurrão deixa você Vulnerável.",
		vidaMax: 96,
		ataque: 5,
		velocidade: 60,
		padrao: "ciclo",
		acoes: [{
			id: "escudar",
			nome: "Escudar",
			requerAliados: true,
			efeitos: [{
				tipo: "bloqueio",
				valor: 18,
				alvo: "aliadoMaisFerido"
			}]
		}, {
			id: "empurrao",
			nome: "Empurrão",
			efeitos: [{
				tipo: "dano",
				mult: 1,
				alvo: "alvo"
			}, {
				tipo: "status",
				status: "vulneravel",
				valor: 2,
				alvo: "alvo"
			}]
		}]
	},
	{
		id: "acolita",
		xp: 9,
		ouro: 4,
		alcance: 3,
		passoMs: 500,
		nome: "Acólita da Fornalha",
		descricao: "Reaviva os aliados feridos. Derrube-a primeiro.",
		vidaMax: 50,
		ataque: 4,
		velocidade: 65,
		padrao: "ciclo",
		acoes: [{
			id: "avivar",
			nome: "Avivar",
			requerAliados: true,
			efeitos: [{
				tipo: "cura",
				pctVidaMax: .15,
				alvo: "aliadoMaisFerido"
			}]
		}, {
			id: "chamuscar",
			nome: "Chamuscar",
			efeitos: [{
				tipo: "dano",
				mult: 1,
				alvo: "alvo"
			}, {
				tipo: "status",
				status: "queimadura",
				valor: 2,
				alvo: "alvo"
			}]
		}]
	},
	{
		id: "guardiaLimiar",
		xp: 160,
		ouro: 90,
		passoMs: 520,
		nome: "Guardiã do Limiar",
		descricao: "Exame de Rank. Varre tudo em volta dela, chama centelhas e, ferida, risca o chão em cruz.",
		vidaMax: 560,
		ataque: 10,
		velocidade: 60,
		padrao: "ciclo",
		acoes: [
			{
				id: "lanca",
				nome: "Golpe de Lança",
				efeitos: [{
					tipo: "dano",
					mult: 1.2,
					alvo: "alvo"
				}]
			},
			{
				id: "lanca2",
				nome: "Golpe de Lança",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}]
			},
			{
				id: "varrer",
				nome: "Varrer o Limiar",
				forte: true,
				forma: "emVolta",
				area: 2,
				efeitos: [{
					tipo: "dano",
					mult: 2.6,
					alvo: "alvo"
				}]
			},
			{
				id: "cruzLimiar",
				nome: "Cruz do Limiar",
				forte: true,
				forma: "cruz",
				area: 6,
				efeitos: [{
					tipo: "dano",
					mult: 2.8,
					alvo: "alvo"
				}]
			}
		],
		fases: [
			{
				abaixoDe: 1.01,
				anuncio: "A Guardiã do Limiar ergue a lança.",
				acoes: [
					"lanca",
					"lanca2",
					"varrer"
				]
			},
			{
				abaixoDe: .7,
				anuncio: "A Guardiã chama as centelhas!",
				invocar: ["centelha", "centelha"]
			},
			{
				abaixoDe: .35,
				anuncio: "A Guardiã acende o Limiar! (+5 de Força, Cruz do Limiar)",
				efeitos: [{
					tipo: "status",
					status: "forca",
					valor: 5,
					alvo: "proprio"
				}],
				acoes: [
					"lanca",
					"cruzLimiar",
					"lanca2",
					"varrer"
				]
			}
		]
	},
	{
		id: "matilheiro",
		xp: 170,
		ouro: 95,
		passoMs: 420,
		nome: "Matilheiro de Escória",
		descricao: "Nunca luta sozinho: chama a matilha quando se fere.",
		vidaMax: 520,
		ataque: 9,
		velocidade: 70,
		padrao: "ciclo",
		acoes: [
			{
				id: "chicote",
				nome: "Chicote",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}]
			},
			{
				id: "chicote2",
				nome: "Chicote",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}]
			},
			{
				id: "ordem",
				nome: "Ordem de Ataque",
				efeitos: [{
					tipo: "dano",
					mult: .6,
					alvo: "alvo"
				}, {
					tipo: "status",
					status: "marca",
					valor: 3,
					alvo: "alvo"
				}]
			}
		],
		fases: [{
			abaixoDe: .7,
			anuncio: "O Matilheiro assobia: a matilha chega!",
			invocar: ["caoDeEscoria", "caoDeEscoria"]
		}, {
			abaixoDe: .4,
			anuncio: "O Matilheiro solta o resto da matilha!",
			invocar: ["caoDeEscoria", "caoDeEscoria"]
		}]
	},
	{
		id: "forjadora",
		xp: 190,
		ouro: 105,
		passoMs: 520,
		nome: "Forjadora Rubra",
		descricao: "Risca o chão em cruz e desce o malho. Ferida, para de bater de leve.",
		vidaMax: 600,
		ataque: 10,
		velocidade: 55,
		padrao: "ciclo",
		acoes: [
			{
				id: "martelo",
				nome: "Martelo",
				efeitos: [{
					tipo: "dano",
					mult: 1.3,
					alvo: "alvo"
				}]
			},
			{
				id: "cruzIncandescente",
				nome: "Cruz Incandescente",
				forte: true,
				forma: "cruz",
				area: 6,
				efeitos: [{
					tipo: "dano",
					mult: 3,
					alvo: "alvo"
				}]
			},
			{
				id: "martelo2",
				nome: "Martelo",
				efeitos: [{
					tipo: "dano",
					mult: 1.3,
					alvo: "alvo"
				}]
			},
			{
				id: "malhoRubro",
				nome: "Malho Rubro",
				forte: true,
				area: 1,
				efeitos: [{
					tipo: "dano",
					mult: 2.6,
					alvo: "alvo"
				}, {
					tipo: "status",
					status: "queimadura",
					valor: 4,
					alvo: "alvo"
				}]
			}
		],
		fases: [{
			abaixoDe: .5,
			anuncio: "A Forjadora aviva a forja! (+5 de Força, só golpes fortes)",
			efeitos: [{
				tipo: "status",
				status: "forca",
				valor: 5,
				alvo: "proprio"
			}],
			acoes: ["cruzIncandescente", "malhoRubro"]
		}]
	},
	{
		id: "caldeira",
		xp: 210,
		ouro: 115,
		alcance: 5,
		passoMs: 2e3,
		nome: "Olho da Caldeira",
		descricao: "Não sai do lugar e atira de longe. O Anel de Fogo não alcança quem encosta nela.",
		vidaMax: 560,
		ataque: 10,
		velocidade: 60,
		padrao: "ciclo",
		acoes: [
			{
				id: "jato",
				nome: "Jato",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}, {
					tipo: "status",
					status: "queimadura",
					valor: 3,
					alvo: "alvo"
				}]
			},
			{
				id: "jato2",
				nome: "Jato",
				efeitos: [{
					tipo: "dano",
					mult: 1,
					alvo: "alvo"
				}]
			},
			{
				id: "anelDeFogo",
				nome: "Anel de Fogo",
				forte: true,
				forma: "anel",
				area: 5,
				efeitos: [{
					tipo: "dano",
					mult: 3.2,
					alvo: "alvo"
				}]
			}
		],
		fases: [{
			abaixoDe: .5,
			anuncio: "A Caldeira transborda: acólitas surgem do vapor!",
			invocar: ["acolita", "acolita"],
			acoes: ["jato", "anelDeFogo"]
		}]
	},
	{
		id: "colosso",
		xp: 240,
		ouro: 130,
		passoMs: 700,
		nome: "Colosso de Escória",
		descricao: "Muita vida. O Terremoto atinge tudo em volta: afaste-se quando ele erguer os braços.",
		vidaMax: 860,
		ataque: 11,
		velocidade: 45,
		padrao: "ciclo",
		acoes: [
			{
				id: "pisao",
				nome: "Pisão",
				efeitos: [{
					tipo: "dano",
					mult: 1.4,
					alvo: "alvo"
				}]
			},
			{
				id: "pisao2",
				nome: "Pisão",
				efeitos: [{
					tipo: "dano",
					mult: 1.2,
					alvo: "alvo"
				}]
			},
			{
				id: "terremoto",
				nome: "Terremoto",
				forte: true,
				forma: "emVolta",
				area: 3,
				preparoMs: 1400,
				efeitos: [{
					tipo: "dano",
					mult: 3,
					alvo: "alvo"
				}]
			}
		],
		fases: [{
			abaixoDe: .6,
			anuncio: "O Colosso chama a guarda de ferro!",
			invocar: ["escudeiro", "escudeiro"]
		}, {
			abaixoDe: .3,
			anuncio: "O Colosso racha por dentro! (+6 de Força)",
			efeitos: [{
				tipo: "status",
				status: "forca",
				valor: 6,
				alvo: "proprio"
			}]
		}]
	},
	{
		id: "arauto",
		xp: 300,
		ouro: 160,
		passoMs: 480,
		nome: "Arauto da Brasa",
		descricao: "O fim das Forjas. Alterna golpes que pedem distância e golpes que pedem que você encoste.",
		vidaMax: 720,
		ataque: 11,
		velocidade: 65,
		padrao: "ciclo",
		acoes: [
			{
				id: "lamina",
				nome: "Lâmina de Brasa",
				efeitos: [{
					tipo: "dano",
					mult: 1.2,
					alvo: "alvo"
				}]
			},
			{
				id: "cruzSolar",
				nome: "Cruz Solar",
				forte: true,
				forma: "cruz",
				area: 7,
				efeitos: [{
					tipo: "dano",
					mult: 3,
					alvo: "alvo"
				}]
			},
			{
				id: "lamina2",
				nome: "Lâmina de Brasa",
				efeitos: [{
					tipo: "dano",
					mult: 1.2,
					alvo: "alvo"
				}]
			},
			{
				id: "anelSolar",
				nome: "Anel Solar",
				forte: true,
				forma: "anel",
				area: 4,
				efeitos: [{
					tipo: "dano",
					mult: 3,
					alvo: "alvo"
				}]
			},
			{
				id: "explosao",
				nome: "Explosão de Brasa",
				forte: true,
				forma: "emVolta",
				area: 2,
				efeitos: [{
					tipo: "dano",
					mult: 3.2,
					alvo: "alvo"
				}, {
					tipo: "status",
					status: "queimadura",
					valor: 5,
					alvo: "alvo"
				}]
			}
		],
		fases: [
			{
				abaixoDe: 1.01,
				anuncio: "O Arauto da Brasa desperta.",
				acoes: [
					"lamina",
					"cruzSolar",
					"lamina2",
					"anelSolar"
				]
			},
			{
				abaixoDe: .7,
				anuncio: "O Arauto espalha centelhas! (Explosão de Brasa)",
				invocar: [
					"centelha",
					"centelha",
					"centelha"
				],
				acoes: [
					"lamina",
					"anelSolar",
					"lamina2",
					"explosao"
				]
			},
			{
				abaixoDe: .35,
				anuncio: "O Arauto arde por inteiro! (+6 de Força)",
				efeitos: [{
					tipo: "status",
					status: "forca",
					valor: 6,
					alvo: "proprio"
				}],
				invocar: ["acolita"],
				acoes: [
					"cruzSolar",
					"anelSolar",
					"explosao"
				]
			}
		]
	}
].map((i) => [i.id, i]));
// src/content/items.ts
function item(id, nome, slot, nivel, stats, valor) {
	return {
		id,
		nome,
		slot,
		nivel,
		stats,
		valor
	};
}
var BASES = [
	item("laminaDeCinza", "Lâmina de Cinza", "arma", 1, { ataque: 2 }, 6),
	item("machadoDoVigia", "Machado do Vigia", "arma", 6, { ataque: 4 }, 14),
	item("espadaDoJuramento", "Espada do Juramento", "arma", 11, { ataque: 6 }, 25),
	item("gumeDaVigiliaFunda", "Gume da Vigília Funda", "arma", 16, { ataque: 8 }, 40),
	item("capuzDeEstopa", "Capuz de Estopa", "cabeca", 1, {
		vida: 8,
		reducao: .01
	}, 6),
	item("elmoDoVigia", "Elmo do Vigia", "cabeca", 6, {
		vida: 16,
		reducao: .015
	}, 14),
	item("elmoDeOssosPolidos", "Elmo de Ossos Polidos", "cabeca", 11, {
		vida: 24,
		reducao: .02
	}, 25),
	item("coroaDoSentinela", "Coroa do Sentinela", "cabeca", 16, {
		vida: 32,
		reducao: .025
	}, 40),
	item("gibaoRemendado", "Gibão Remendado", "peito", 1, {
		vida: 15,
		reducao: .02
	}, 6),
	item("cotaDoVigia", "Cota do Vigia", "peito", 6, {
		vida: 30,
		reducao: .03
	}, 14),
	item("couracaDeFerroPalido", "Couraça de Ferro Pálido", "peito", 11, {
		vida: 45,
		reducao: .04
	}, 25),
	item("peitoralDoJuramento", "Peitoral do Juramento", "peito", 16, {
		vida: 60,
		reducao: .05
	}, 40),
	item("luvasDeCouroCru", "Luvas de Couro Cru", "maos", 1, {
		ataque: 1,
		critico: .02
	}, 6),
	item("manoplasDoVigia", "Manoplas do Vigia", "maos", 6, {
		ataque: 2,
		critico: .03
	}, 14),
	item("garrasDeFerro", "Garras de Ferro", "maos", 11, {
		ataque: 3,
		critico: .04
	}, 25),
	item("punhosDaVigilia", "Punhos da Vigília", "maos", 16, {
		ataque: 4,
		critico: .05
	}, 40),
	item("botasDeAndarilho", "Botas de Andarilho", "pes", 1, {
		velocidade: 3,
		vida: 5
	}, 6),
	item("grevasDoVigia", "Grevas do Vigia", "pes", 6, {
		velocidade: 5,
		vida: 10
	}, 14),
	item("botasDeCinzaLeve", "Botas de Cinza Leve", "pes", 11, {
		velocidade: 7,
		vida: 15
	}, 25),
	item("passosDoJuramento", "Passos do Juramento", "pes", 16, {
		velocidade: 9,
		vida: 20
	}, 40),
	item("pingenteDeOsso", "Pingente de Osso", "amuleto", 1, {
		poder: .03,
		danoCritico: .05
	}, 6),
	item("medalhaoDoVigia", "Medalhão do Vigia", "amuleto", 6, {
		poder: .06,
		danoCritico: .1
	}, 14),
	item("olhoDeAmbar", "Olho de Âmbar", "amuleto", 11, {
		poder: .09,
		danoCritico: .15
	}, 25),
	item("relicarioDoJuramento", "Relicário do Juramento", "amuleto", 16, {
		poder: .12,
		danoCritico: .2
	}, 40),
	item("cuteloDeEscoria", "Cutelo de Escória", "arma", 21, { ataque: 10 }, 60),
	item("marteloDaForja", "Martelo da Forja", "arma", 26, { ataque: 12 }, 85),
	item("laminaDoArauto", "Lâmina do Arauto", "arma", 31, { ataque: 14 }, 115),
	item("elmoFuligem", "Elmo de Fuligem", "cabeca", 21, {
		vida: 40,
		reducao: .03
	}, 60),
	item("mascaraDaForja", "Máscara da Forja", "cabeca", 26, {
		vida: 48,
		reducao: .035
	}, 85),
	item("coroaDeBrasas", "Coroa de Brasas", "cabeca", 31, {
		vida: 56,
		reducao: .04
	}, 115),
	item("couracaDeEscoria", "Couraça de Escória", "peito", 21, {
		vida: 75,
		reducao: .06
	}, 60),
	item("placasDaForja", "Placas da Forja", "peito", 26, {
		vida: 90,
		reducao: .07
	}, 85),
	item("mantoDoArauto", "Manto do Arauto", "peito", 31, {
		vida: 105,
		reducao: .08
	}, 115),
	item("luvasDeFerreiro", "Luvas de Ferreiro", "maos", 21, {
		ataque: 5,
		critico: .06
	}, 60),
	item("garrasRubras", "Garras Rubras", "maos", 26, {
		ataque: 6,
		critico: .07
	}, 85),
	item("punhosDeBrasa", "Punhos de Brasa", "maos", 31, {
		ataque: 7,
		critico: .08
	}, 115),
	item("botasDeCinzaQuente", "Botas de Cinza Quente", "pes", 21, {
		velocidade: 11,
		vida: 25
	}, 60),
	item("grevasDaForja", "Grevas da Forja", "pes", 26, {
		velocidade: 13,
		vida: 30
	}, 85),
	item("passosDoArauto", "Passos do Arauto", "pes", 31, {
		velocidade: 15,
		vida: 35
	}, 115),
	item("brasaEngastada", "Brasa Engastada", "amuleto", 21, {
		poder: .15,
		danoCritico: .25
	}, 60),
	item("selanteDaForja", "Selante da Forja", "amuleto", 26, {
		poder: .18,
		danoCritico: .3
	}, 85),
	item("coracaoDeBrasa", "Coração de Brasa", "amuleto", 31, {
		poder: .21,
		danoCritico: .35
	}, 115)
];
var ITENS = {
	bases: Object.fromEntries(BASES.map((b) => [b.id, b])),
	afixos: Object.fromEntries([
		{
			id: "forca",
			nome: "da Força",
			stat: "forca",
			min: 1,
			max: 2,
			porNivel: .25
		},
		{
			id: "agilidade",
			nome: "da Agilidade",
			stat: "agilidade",
			min: 1,
			max: 2,
			porNivel: .25
		},
		{
			id: "vigor",
			nome: "do Vigor",
			stat: "vigor",
			min: 1,
			max: 2,
			porNivel: .25
		},
		{
			id: "percepcao",
			nome: "da Percepção",
			stat: "percepcao",
			min: 1,
			max: 2,
			porNivel: .25
		},
		{
			id: "vontade",
			nome: "da Vontade",
			stat: "vontade",
			min: 1,
			max: 2,
			porNivel: .25
		},
		{
			id: "robustez",
			nome: "da Robustez",
			stat: "vida",
			min: 5,
			max: 10,
			porNivel: 1.5,
			slots: [
				"cabeca",
				"peito",
				"pes",
				"amuleto"
			]
		},
		{
			id: "olhoAtento",
			nome: "do Olho Atento",
			stat: "critico",
			min: .01,
			max: .02,
			porNivel: .001
		},
		{
			id: "pressa",
			nome: "da Pressa",
			stat: "velocidade",
			min: 2,
			max: 4,
			porNivel: .3,
			slots: [
				"maos",
				"pes",
				"amuleto"
			]
		},
		{
			id: "sanguessuga",
			nome: "da Sanguessuga",
			stat: "rouboVida",
			min: .02,
			max: .03,
			porNivel: .001,
			slots: ["arma", "amuleto"]
		},
		{
			id: "peconha",
			nome: "da Peçonha",
			stat: "venenoAoAcertar",
			min: 1,
			max: 2,
			porNivel: .15,
			slots: ["arma", "maos"]
		}
	].map((a) => [a.id, a])),
	raridades: {
		comum: {
			peso: 70,
			multBase: 1,
			afixos: 0,
			multValor: 1
		},
		incomum: {
			peso: 25,
			multBase: 1.1,
			afixos: 1,
			multValor: 2
		},
		rara: {
			peso: 5,
			multBase: 1.2,
			afixos: 2,
			multValor: 5
		}
	},
	chanceDeSaque: .12,
	saquePorPortal: {
		cinza1: [1],
		cinza2: [1, 6],
		cinza3: [6],
		cinza4: [6, 11],
		cinza5: [11, 16],
		exameBrasa: [16, 21],
		brasa1: [16, 21],
		brasa2: [21],
		brasa3: [21, 26],
		brasa4: [26, 31],
		brasa5: [31]
	},
	capacidadeMochila: 20,
	capacidadeBau: 60,
	expedicao: {
		fator: .5,
		maximo: 15
	},
	pocao: {
		preco: 12,
		curaPct: .3,
		recargaS: 10,
		maximo: 10
	}
};
// src/content/portals.ts
var lista$1 = [
	{
		id: "cinza1",
		selo: "seloCarnical",
		levelRecomendado: 1,
		nome: "Cinza I",
		rank: "cinza",
		descricao: "Carniçais vagando perto da entrada. O caçador vence sozinho.",
		ondas: [["carnical"], ["carnical", "carnical"]],
		escala: {
			vida: 1,
			ataque: 1
		},
		recompensa: {
			xp: 12,
			ouro: 5
		},
		primeiraVitoria: {
			xp: 30,
			ouro: 20
		}
	},
	{
		id: "cinza2",
		selo: "seloRato",
		levelRecomendado: 6,
		nome: "Cinza II",
		rank: "cinza",
		descricao: "Bandos de ratos rápidos. Ataques em área ajudam.",
		ondas: [
			[
				"ratoDeCinza",
				"ratoDeCinza",
				"ratoDeCinza"
			],
			[
				"carnical",
				"ratoDeCinza",
				"ratoDeCinza"
			],
			["carnical", "carnical"]
		],
		escala: {
			vida: 1.3,
			ataque: 1.3
		},
		recompensa: {
			xp: 25,
			ouro: 10
		},
		primeiraVitoria: {
			xp: 75,
			ouro: 40
		},
		requer: "cinza1"
	},
	{
		id: "cinza3",
		selo: "seloTecela",
		levelRecomendado: 9,
		nome: "Cinza III",
		rank: "cinza",
		descricao: "Tecelãs envenenam e enfraquecem. Escolha bem o alvo e a cura.",
		ondas: [
			["tecela", "carnical"],
			["tecela", "tecela"],
			[
				"tecela",
				"carnical",
				"carnical"
			]
		],
		escala: {
			vida: 1.8,
			ataque: 1.7
		},
		recompensa: {
			xp: 45,
			ouro: 18
		},
		primeiraVitoria: {
			xp: 135,
			ouro: 70
		},
		requer: "cinza2"
	},
	{
		id: "cinza4",
		selo: "seloSentinela",
		levelRecomendado: 11,
		nome: "Cinza IV",
		rank: "cinza",
		descricao: "Sentinelas protegem arqueiros. Derrube quem bate forte primeiro.",
		ondas: [
			["sentinela", "arqueiro"],
			[
				"arqueiro",
				"arqueiro",
				"carnical"
			],
			[
				"sentinela",
				"arqueiro",
				"arqueiro"
			]
		],
		escala: {
			vida: 2.7,
			ataque: 2.4
		},
		recompensa: {
			xp: 75,
			ouro: 30
		},
		primeiraVitoria: {
			xp: 225,
			ouro: 120
		},
		requer: "cinza3"
	},
	{
		id: "cinza5",
		selo: "seloCavaleiro",
		levelRecomendado: 16,
		nome: "Cinza V",
		rank: "cinza",
		descricao: "O Cavaleiro Oco guarda o fim da região. Prepare a guarda contra a Execução.",
		ondas: [
			["carnical", "tecela"],
			["sentinela", "arqueiro"],
			["cavaleiro"]
		],
		escala: {
			vida: 3,
			ataque: 2.6
		},
		recompensa: {
			xp: 130,
			ouro: 50
		},
		primeiraVitoria: {
			xp: 400,
			ouro: 200
		},
		requer: "cinza4",
		chefe: true
	},
	{
		id: "exameBrasa",
		levelRecomendado: 18,
		nome: "Exame de Rank",
		rank: "cinza",
		descricao: "A Guardiã do Limiar decide quem passa para o rank Brasa. Saia da área marcada no chão.",
		ondas: [["ferreiro", "carnical"], ["guardiaLimiar"]],
		escala: {
			vida: 3.3,
			ataque: 2.8
		},
		recompensa: {
			xp: 180,
			ouro: 70
		},
		primeiraVitoria: {
			xp: 900,
			ouro: 400
		},
		requer: "cinza5",
		chefe: true,
		promove: "brasa",
		selo: "seloLimiar"
	},
	{
		id: "brasa1",
		levelRecomendado: 20,
		nome: "Brasa I",
		rank: "brasa",
		descricao: "Matilhas de cães de escória. Golpes em área e cuidado com a Marca.",
		ondas: [
			[
				"caoDeEscoria",
				"caoDeEscoria",
				"caoDeEscoria"
			],
			["ferreiro", "caoDeEscoria"],
			["matilheiro"]
		],
		escala: {
			vida: 3.6,
			ataque: 2.9
		},
		recompensa: {
			xp: 200,
			ouro: 80
		},
		primeiraVitoria: {
			xp: 1e3,
			ouro: 450
		},
		requer: "exameBrasa",
		chefe: true,
		selo: "seloMatilheiro"
	},
	{
		id: "brasa2",
		levelRecomendado: 23,
		nome: "Brasa II",
		rank: "brasa",
		descricao: "Ferreiros e lançadoras. Saia do Malho e da Cruz Incandescente.",
		ondas: [
			["ferreiro", "lancadora"],
			[
				"lancadora",
				"lancadora",
				"caoDeEscoria"
			],
			["forjadora"]
		],
		escala: {
			vida: 4.2,
			ataque: 3.2
		},
		recompensa: {
			xp: 260,
			ouro: 100
		},
		primeiraVitoria: {
			xp: 1300,
			ouro: 550
		},
		requer: "brasa1",
		chefe: true,
		selo: "seloForjadora"
	},
	{
		id: "brasa3",
		levelRecomendado: 26,
		nome: "Brasa III",
		rank: "brasa",
		descricao: "Acólitas curam quem estiver ferido. Contra o Anel de Fogo, encoste na Caldeira.",
		ondas: [
			["acolita", "ferreiro"],
			[
				"acolita",
				"lancadora",
				"caoDeEscoria"
			],
			["caldeira"]
		],
		escala: {
			vida: 4.9,
			ataque: 3.5
		},
		recompensa: {
			xp: 330,
			ouro: 125
		},
		primeiraVitoria: {
			xp: 1600,
			ouro: 700
		},
		requer: "brasa2",
		chefe: true,
		selo: "seloCaldeira"
	},
	{
		id: "brasa4",
		levelRecomendado: 29,
		nome: "Brasa IV",
		rank: "brasa",
		descricao: "Escudeiros protegem tudo. O Colosso aguenta muito: leve poções.",
		ondas: [
			["escudeiro", "ferreiro"],
			[
				"escudeiro",
				"lancadora",
				"acolita"
			],
			["colosso"]
		],
		escala: {
			vida: 5.6,
			ataque: 3.8
		},
		recompensa: {
			xp: 420,
			ouro: 155
		},
		primeiraVitoria: {
			xp: 2e3,
			ouro: 850
		},
		requer: "brasa3",
		chefe: true,
		selo: "seloColosso"
	},
	{
		id: "brasa5",
		levelRecomendado: 32,
		nome: "Brasa V",
		rank: "brasa",
		descricao: "O Arauto da Brasa alterna golpes de perto e de longe. Leia o chão.",
		ondas: [
			[
				"ferreiro",
				"acolita",
				"lancadora"
			],
			[
				"escudeiro",
				"caoDeEscoria",
				"lancadora"
			],
			["arauto"]
		],
		escala: {
			vida: 6.4,
			ataque: 4.1
		},
		recompensa: {
			xp: 520,
			ouro: 190
		},
		primeiraVitoria: {
			xp: 2600,
			ouro: 1100
		},
		requer: "brasa4",
		chefe: true,
		selo: "seloArauto"
	}
];
// src/content/index.ts
/** Todo o conteúdo do jogo, no formato que o motor recebe. */
var CONTEUDO = {
	progressao: {
		levelMax: 40,
		xpBase: 20,
		xpExpoente: 1.6,
		pontosPorLevel: 3,
		atributoInicial: 5,
		stats: {
			vidaBase: 80,
			vidaPorLevel: 4,
			vidaPorVigor: 8,
			ataqueBase: 8,
			ataquePorLevel: .6,
			ataquePorForca: 1,
			danoPctPorForca: .02,
			velocidadeBase: 100,
			velocidadePctPorAgilidade: .015,
			velocidadeBonusMax: .75,
			reducaoPorVigor: .005,
			reducaoMax: .3,
			criticoBase: .05,
			criticoPorPercepcao: .01,
			criticoMax: .5,
			danoCriticoBase: 1.5,
			danoCriticoPorPercepcao: .01,
			poderPorVontade: .02,
			recargaPorVontade: .01,
			recargaReducaoMax: .3
		},
		espacosDeHabilidade: 4,
		habilidadeNivelMax: 5,
		escalaPorNivelDeHabilidade: .15,
		custoMelhoriaBase: 50,
		ataqueBasico: {
			nome: "Golpe",
			mult: 1
		},
		combate: {
			tickMs: 100,
			cargaParaAgir: 1e3,
			limiteS: 90,
			decaimentoBloqueio: .2
		},
		expedicao: {
			lutasAmostra: 20,
			pausaEntreLutasS: 3,
			tetoHoras: 8
		},
		xpAcimaDoRecomendado: {
			tolerancia: 1,
			quedaPorLevel: .25,
			minimo: .02
		}
	},
	habilidades: HABILIDADES,
	inimigos: INIMIGOS,
	portais: Object.fromEntries(lista$1.map((p) => [p.id, p])),
	ordemPortais: lista$1.map((p) => p.id),
	mundo: {
		tickMs: 50,
		passoMsCacador: 300,
		passoMsMinimo: 160,
		visaoMonstro: 5,
		coleira: 14,
		renascerS: 90,
		raioRevelado: 7,
		preparoForteMs: 1e3,
		raioGrupo: 2,
		ritmoMonstros: 1.5
	},
	mapas: Object.fromEntries([
		{
			id: "posto",
			nome: "Posto da Vigília",
			tipo: "posto",
			linhas: [
				"############################",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,#####,,,,,,,,,,,,,,#####,#",
				"#,#M.B#,,,,,,,,,,,,,,#A.X#,#",
				"#,#...#,,,,~~~~~~,,,,#...#,#",
				"#,##.##,,,,~~~~~~,,,,##.##,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,..,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,@.,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,..,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,1,,,,2,,,,3,,,,4,,,,5,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,R,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,6,,,,7,,,,8,,,,9,,,,0,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"############################"
			],
			legenda: {
				objetos: {
					M: "mercadora",
					B: "bau",
					A: "altar",
					X: "expedicao"
				},
				portoes: {
					"1": {
						destino: "cinza1",
						rotulo: "Cinza I"
					},
					"2": {
						destino: "cinza2",
						rotulo: "Cinza II"
					},
					"3": {
						destino: "cinza3",
						rotulo: "Cinza III"
					},
					"4": {
						destino: "cinza4",
						rotulo: "Cinza IV"
					},
					"5": {
						destino: "cinza5",
						rotulo: "Cinza V"
					},
					R: {
						destino: "exameBrasa",
						rotulo: "Exame de Rank"
					},
					"6": {
						destino: "brasa1",
						rotulo: "Brasa I"
					},
					"7": {
						destino: "brasa2",
						rotulo: "Brasa II"
					},
					"8": {
						destino: "brasa3",
						rotulo: "Brasa III"
					},
					"9": {
						destino: "brasa4",
						rotulo: "Brasa IV"
					},
					"0": {
						destino: "brasa5",
						rotulo: "Brasa V"
					}
				}
			}
		},
		{
			id: "cinza1",
			nome: "Cinza I",
			tipo: "portal",
			portal: "cinza1",
			linhas: [
				"########################################",
				"#E@.....#,,,,,,,,,,,,,#................#",
				"#.......#,,,c,,,,,,,,,#.....c........T.#",
				"#.......#,,,,,,,,,c,,,#..........c.....#",
				"#.......,,,,,,,,,,,,,,,................#",
				"#.......#,,,,,,c,,,,,,#.......c........#",
				"###.#####,,,,,,,,,,,,,######.###########",
				"#,,,,,,,#######.#######,,,,,,,,,,,,,,,,#",
				"#,,c,,,,,,,,,,#.#,,,,,,,,,,,,,,c,,,,,,,#",
				"#,,,,,,,,,,,,,#.#,,,,c,,,,,,,,,,,,,,,,,#",
				"#,,,,,,c,,,,,,...,,,,,,,,,,,,,,,,,,c,,,#",
				"#,,,,,,,,,,,,,#.#,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,c,,,#.#,,,,,,,,,,~~~~,,,,,,,,#",
				"#,,,,,,,,,,,,,#.#,,,,,,,,,,~~~~,,,,,,,,#",
				"#######.#######.#############.##########",
				"#.....,..............#.......,.........#",
				"#..c.................#.................#",
				"#..........c.........#.....#####.......#",
				"#....................#.....#,,,#.......#",
				"#..........................#,C,#.......#",
				"#....................#.....#,,,#.......#",
				"#T......c............#.....##.##.......#",
				"#....................#.................#",
				"########################################"
			],
			legenda: {
				monstros: { c: "carnical" },
				chefes: { C: "carnical" },
				objetos: { T: "tesouro" },
				portoes: { E: {
					destino: "posto",
					rotulo: "Voltar ao Posto"
				} }
			}
		},
		{
			id: "cinza2",
			nome: "Cinza II",
			tipo: "portal",
			portal: "cinza2",
			linhas: [
				"############################################",
				"#........###,,,,,,,,,,,,####..............##",
				"#.E@.....###,r,,,,,,,,,,####............T.##",
				"#........###,,,,,,,,,,,,####..............##",
				"#...........,,rr,,,,,,,,..................##",
				"#........#..,,,,,,,,,,,,..................##",
				"#........#.#,,,,,,,,,,,,####.r..cr........##",
				"##########.#,,,,,,,,,,,,####..............##",
				"##########.#################..............##",
				"##########.#################################",
				"##########.#################################",
				"###,,,,,,,,,,,,,,###########################",
				"###,,,,,,,,,,,,,,###..........##############",
				"###,,,,~~~~,,,c,,###.....r....#,,,,,,,,,,,,#",
				"###,,,,~~~~,r,,,,###..........#,,,,,,,,,,,,#",
				"###,,,,~~~~,c,,,,....c.........,,,,,,,,,,,,#",
				"###,,,,,,,,,,,,,,###..........#,,,,,,,,,,,,#",
				"###,T,,,,,r,,,,,,###..........#,,,,,,,,,,,,#",
				"###,,,,,,,,,,,,,,##############,,,,,,K,,,,,#",
				"###############################,,,,,,,,,,,,#",
				"###############################,,,,,,,,,,,,#",
				"###############################,,,,,,,,,,,,#",
				"###############################,,,,,,,,,,,,#",
				"###############################,,,,,,,,,,,,#",
				"############################################",
				"############################################"
			],
			legenda: {
				monstros: {
					c: "carnical",
					r: "ratoDeCinza"
				},
				chefes: { K: "ratoDeCinza" },
				objetos: { T: "tesouro" },
				portoes: { E: {
					destino: "posto",
					rotulo: "Voltar ao Posto"
				} }
			}
		},
		{
			id: "cinza3",
			nome: "Cinza III",
			tipo: "portal",
			portal: "cinza3",
			linhas: [
				"##############################################",
				"#........#####################,,,,,,,,,,,,,,,#",
				"#.E@.....###,,,,,,,,,,,,,,####,,,,,,,,,,,,,T,#",
				"#........###,,,,,,,,,,,,,,####,,,,,,,,,,,,,,,#",
				"#...........,,,,~~~~,c,,,,####,,,,,,,,,,,,,,,#",
				"#........###,,,,~~~~,,,,,,####,,,,,,,,,,,,,,,#",
				"#........###,,,,,,,,,,,,,,....,,,,,,t,,,,,,,,#",
				"############,,,,t,,,,,,,,,####,,,,,,,,t,,,,,,#",
				"############,,,,,,,,,,,,,,####,,,,,,,,,,,,,,,#",
				"############,,,,,,,,,,,,,,####,,,,,,,,,,,,,,,#",
				"#####################################.########",
				"#####################################.########",
				"#####################################.########",
				"###############################.............##",
				"##############,,,,,,,,,,,,,####..........t..##",
				"##############,,,,,,,,,,,,,####.........c...##",
				"##############,,,,,,,,,,,,,####........c....##",
				"##############,,,,,,,,,,,,,.................##",
				"######........,,,,,,,,,t,,,####.............##",
				"######.#######,,,,,,,,c,,,,####.............##",
				"#...........##,,,,t,,,,,,,,####.............##",
				"#...........##,T,,,,,,,,,,,###################",
				"#...........##,,,,,,,,,,,,,###################",
				"#...........##################################",
				"#.....K.....##################################",
				"#...........##################################",
				"#...........##################################",
				"#...........##################################",
				"#...........##################################",
				"##############################################"
			],
			legenda: {
				monstros: {
					c: "carnical",
					t: "tecela"
				},
				chefes: { K: "tecela" },
				objetos: { T: "tesouro" },
				portoes: { E: {
					destino: "posto",
					rotulo: "Voltar ao Posto"
				} }
			}
		},
		{
			id: "cinza4",
			nome: "Cinza IV",
			tipo: "portal",
			portal: "cinza4",
			linhas: [
				"################################################",
				"#........##..............###,,,,,,,,,,,,,,,,,,##",
				"#.E@.....##..............###,,,c,a,,,,,,,,,,T,##",
				"#........##..............###,,,,,,,,,,,,,,,,,,##",
				"#..............s.........###,,,,,,,,,,,,,,,,,,##",
				"#........##.................,,,,,,,,,,,,,a,,,,##",
				"#........##..............###,,,,,,,,,,,,,,,,,,##",
				"###########..a...........###,,,,,,,,,,,,,,,,,,##",
				"###########..............###,,,,,,,,,,,,,,,,,,##",
				"###########..............#############.#########",
				"######################################.#########",
				"######################################.#########",
				"##############################................##",
				"##########,,,,,,,,,,,,,,,,####.....a..........##",
				"##########,,,,,,,,,,,,,,a,####................##",
				"##########,,,,,s,,,,,,,,,,####................##",
				"##########,,,,,,,,,a,,,,,,....................##",
				"##########,,,,,,,,,,,,,,,,####....a..s........##",
				"##########,,,,,,,,,,,,,,,,####................##",
				"##########,T,,,,,,,,,,,,,,####................##",
				"##########,,,,,,,,,,,,,,,,######################",
				"###########.####################################",
				"#....................###########################",
				"#....................###########################",
				"#....................###########################",
				"#..........K.........###########################",
				"#....................###########################",
				"#....................###########################",
				"#....................###########################",
				"################################################"
			],
			legenda: {
				monstros: {
					a: "arqueiro",
					c: "carnical",
					s: "sentinela"
				},
				chefes: { K: "sentinela" },
				objetos: { T: "tesouro" },
				portoes: { E: {
					destino: "posto",
					rotulo: "Voltar ao Posto"
				} }
			}
		},
		{
			id: "cinza5",
			nome: "Cinza V",
			tipo: "portal",
			portal: "cinza5",
			chefe: {
				vida: 1.6,
				ataque: 1
			},
			linhas: [
				"##################################################",
				"#........##,,,,,,,,,,,,,,###....................##",
				"#.E@.....##,,,,,,,,,,,,,,###.................sT.##",
				"#........##,,,,,,,,,,,,,,###....................##",
				"#..........,,,,,,,,,,c,t,###....................##",
				"#........##,,,,,,,,,,,,,,.......................##",
				"#........##,,,,,,,,,,,,,,###....................##",
				"###########,,,,,,,,,,,,,,###........s...........##",
				"###########,,,,,,,,,,,,,,###...............a....##",
				"############################....................##",
				"#######################################.##########",
				"#######################################.##########",
				"#######################################.##########",
				"########..................####,,,,,,,,,,,,,,,,,,##",
				"########........t.........####,,,,,,,,,,,,,,,,,,##",
				"########..................####,,c,,,,,,,,,,,,,a,##",
				"########..................####,,,,s,,,,,,,,,,,,,##",
				"########.......a..............,,,,,,,,,,,,,,,,,,##",
				"########....a.............####,,,,,,,,,,,,,c,,,,##",
				"########.T................####,,,,,,,,,,,,,,,,,,##",
				"########..................####,,,,,,,,,,,,,,,,,,##",
				"#########################.########################",
				"#########################.########################",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,#,,,,,,,#,,,,,,,,,,,,,,,,#,,,,,,,#,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,K,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,#,,,,,,,#,,,,,,,,,,,,,,,,#,,,,,,,#,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"##################################################"
			],
			legenda: {
				monstros: {
					a: "arqueiro",
					c: "carnical",
					s: "sentinela",
					t: "tecela"
				},
				chefes: { K: "cavaleiro" },
				objetos: { T: "tesouro" },
				portoes: { E: {
					destino: "posto",
					rotulo: "Voltar ao Posto"
				} }
			}
		},
		{
			id: "exameBrasa",
			nome: "Exame de Rank",
			tipo: "portal",
			tema: "brasa",
			portal: "exameBrasa",
			chefe: {
				vida: 2.5,
				ataque: 1
			},
			linhas: [
				"########################################",
				"#........###,,,,,,,,,,###.............##",
				"#.E@.....###,,,,,,,,,,###...........T.##",
				"#........###,,,,,,,,c,###.............##",
				"#...........,,,,,,,,,,................##",
				"#........###,,,,,,,,f,###.............##",
				"#........###,,,,,,,,,,###...f....c....##",
				"####################.####.............##",
				"####################.###################",
				"####################.###################",
				"#########,,,,,,,,,,,,,,,,,,,,,,,########",
				"#########,,,,,,,,,,,,,,,,,,,,,,,########",
				"#########,,,,#,,,,,,,,,,,,,#,,,,########",
				"#########,,,,,,,,,,,,,,,,,,,,,,,########",
				"#########,,,,,,,,,,,,,,,,,,,,,,,########",
				"#########,,,,,,,,,,,,,,,,,,,,,,,########",
				"#########,,,,,,,,,,,K,,,,,,,,,,,########",
				"#########,,,,,,,,,,,,,,,,,,,,,,,########",
				"#########,,,,,,,,,,,,,,,,,,,,,,,########",
				"#########,,,,,,,,,,,,,,,,,,,,,,,########",
				"#########,,,,#,,,,,,,,,,,,,#,,,,########",
				"#########,,,,,,,,,,,,,,,,,,,,,,,########",
				"#########,,,,,,,,,,,,,,,,,,,,,,,########",
				"########################################"
			],
			legenda: {
				monstros: {
					c: "carnical",
					f: "ferreiro"
				},
				chefes: { K: "guardiaLimiar" },
				objetos: { T: "tesouro" },
				portoes: { E: {
					destino: "posto",
					rotulo: "Voltar ao Posto"
				} }
			}
		},
		{
			id: "brasa1",
			nome: "Brasa I",
			tipo: "portal",
			tema: "brasa",
			portal: "brasa1",
			chefe: {
				vida: 2.5,
				ataque: 1
			},
			linhas: [
				"##############################################",
				"#........###,,,,,,,,,,,,,####...............##",
				"#.E@.....###,,,,,,,,,,,,,####.............T.##",
				"#........###,,,~~~,,,,,,,####...............##",
				"#...........,,,~~~,,,,,,,####...............##",
				"#........###,,,c,c,,,,,,,........c..........##",
				"#........###,,,,,,,,,,,,,####...c.........f.##",
				"############,,,,,,,c,,,,,####...............##",
				"############,,,,,,,,,,,,,####...............##",
				"####################################.#########",
				"####################################.#########",
				"####################################.#########",
				"##########..............####,,,,,,,,,,,,,,,,##",
				"##########.T..........c.####,,,,,,,,,,,,,c,,##",
				"##########..c.c.........####,,,,,,,,,c,,,,,,##",
				"##########..................,f,,,,,,,,,,,,,,##",
				"##########..............####,,,,,,,,,,c,,,,,##",
				"##########..............####,,,,,,,,,,,,,,,,##",
				"##########..............####,,,,,,,,,,,,,,,,##",
				"############.#################################",
				"#,,,,,,,,,,,,,,,,,,,,,,#######################",
				"#,,,,,,,,,,,,,,,,,,,,,,#######################",
				"#,,,,,,,,,,,,,,,,,,,,,,#######################",
				"#,,,,,,,,,,,K,,,,,,,,,,#######################",
				"#,,,,,,,,,,,,,,,,,,,,,,#######################",
				"#,,,,,,,,,,,,,,,,,,,,,,#######################",
				"#,,,,,,,,,,,,,,,,,,,,,,#######################",
				"##############################################"
			],
			legenda: {
				monstros: {
					c: "caoDeEscoria",
					f: "ferreiro"
				},
				chefes: { K: "matilheiro" },
				objetos: { T: "tesouro" },
				portoes: { E: {
					destino: "posto",
					rotulo: "Voltar ao Posto"
				} }
			}
		},
		{
			id: "brasa2",
			nome: "Brasa II",
			tipo: "portal",
			tema: "brasa",
			portal: "brasa2",
			chefe: {
				vida: 2.5,
				ataque: 1
			},
			linhas: [
				"################################################",
				"#........##,,,,,,,,,,,,,,###..................##",
				"#.E@.....##,,,,,,,,,,,,,,###............c...T.##",
				"#........##,,,f,,,,,,,,,,###...............l..##",
				"#..........,,,,,,,,,,,,,,###..................##",
				"#........##,,,,,,,,,,,,,,.....................##",
				"#........##,l,,,,,,,,,,,,###..................##",
				"###########,,,,,,,,,,,,,,###....l.............##",
				"###########,,,,,,,,,,,,,,###..................##",
				"###########,,,,,,,,,,,,,,#############.#########",
				"######################################.#########",
				"######################################.#########",
				"##############################,,,,,,,,,,,,,,,,##",
				"##########................####,,,,,,,,,,,,,,,,##",
				"##########............l...####,,,,,,,,,,f,,,,,##",
				"##########................####,l,~f~~,,,,,,,,,##",
				"##########....................,,,~~~~,,,,,,,,,##",
				"##########............c...####,,,,,,,,,,,,,,,,##",
				"##########................####,,,,,,,,,,,,,,,,##",
				"##########.T.......l......####,,,,,,,,,,,,,,,,##",
				"##########................######################",
				"#############.##################################",
				"#,,,,,,,,,,,,,,,,,,,,,,,,#######################",
				"#,,,,,,,,,,,,,,,,,,,,,,,,#######################",
				"#,,,,,,,,,,,,,,,,,,,,,,,,#######################",
				"#,,,,,,,,,,,,K,,,,,,,,,,,#######################",
				"#,,,,,,,,,,,,,,,,,,,,,,,,#######################",
				"#,,,,,,,,,,,,,,,,,,,,,,,,#######################",
				"#,,,,,,,,,,,,,,,,,,,,,,,,#######################",
				"################################################"
			],
			legenda: {
				monstros: {
					c: "caoDeEscoria",
					f: "ferreiro",
					l: "lancadora"
				},
				chefes: { K: "forjadora" },
				objetos: { T: "tesouro" },
				portoes: { E: {
					destino: "posto",
					rotulo: "Voltar ao Posto"
				} }
			}
		},
		{
			id: "brasa3",
			nome: "Brasa III",
			tipo: "portal",
			tema: "brasa",
			portal: "brasa3",
			chefe: {
				vida: 2.5,
				ataque: 1
			},
			linhas: [
				"################################################",
				"#........#####################,,,,,,,,,,,,,,,,##",
				"#.E@.....###,,,,,,,,,,,,,,####,,,,,,,,,,,,,,T,##",
				"#........###,,,,,a,,,,,,,,####,,,,,,c,,,,,,,,,##",
				"#...........,,,,~~~~,,,,,,####,,,,,,,,,,,,,,,,##",
				"#........###,,,,~~~~,,,,,,####,,,,,a,,,,,,,,,,##",
				"#........###,,,,,,,,,,,,,,....,,,,,,,l,,,,,,,,##",
				"############,f,,,,,,,,,,,,####,,,,,,,,,,,,,,,,##",
				"############,,,,,,,,,,,,,,####,,,,,,,,,,,,,,,,##",
				"############,,,,,,,,,,,,,,####,,,,,,,,,,,,,,,,##",
				"######################################.#########",
				"######################################.#########",
				"######################################.#########",
				"###############################...............##",
				"##############,,,,,,,,,,,,,####...............##",
				"##############,c,,,,,,,,,,,####.a..........f..##",
				"##############,,,,,,,,,,,,,####...............##",
				"##############,,,,,,,,,,,,,.........l.........##",
				"#######.......,,,,,,,,,,a,,####...............##",
				"#............#,,,,,,,,,,,,,####...............##",
				"#............#,,a,,,,,,,,,,####...............##",
				"#............#,T,,,,,,,,,,,#####################",
				"#............###################################",
				"#............###################################",
				"#......K.....###################################",
				"#............###################################",
				"#............###################################",
				"#............###################################",
				"#............###################################",
				"################################################"
			],
			legenda: {
				monstros: {
					a: "acolita",
					c: "caoDeEscoria",
					f: "ferreiro",
					l: "lancadora"
				},
				chefes: { K: "caldeira" },
				objetos: { T: "tesouro" },
				portoes: { E: {
					destino: "posto",
					rotulo: "Voltar ao Posto"
				} }
			}
		},
		{
			id: "brasa4",
			nome: "Brasa IV",
			tipo: "portal",
			tema: "brasa",
			portal: "brasa4",
			chefe: {
				vida: 2.5,
				ataque: 1
			},
			linhas: [
				"##################################################",
				"#........##,,,,,,,,,,,,,,###....................##",
				"#.E@.....##,,,,,,,,,,,,,,###..................T.##",
				"#........##,,,,,,,,,,f,,,###.......e............##",
				"#..........,,,,,,,,,,,,,,###....................##",
				"#........##,,,,,,,,,,,,e,.......................##",
				"#........##,,,,,,,,,,,,,,###....................##",
				"###########,,,,,,,,,,,,,,###...l................##",
				"###########,,,,,,,,,,,,,,###.....a..............##",
				"############################....................##",
				"#######################################.##########",
				"#######################################.##########",
				"#######################################.##########",
				"########..................####,,,,,,,,,,,,,,,,,,##",
				"########..................####,,,,e,,,,,,,,,,,,,##",
				"########..................####,,,,,,,,,,,,,,,,,,##",
				"########..................####,,,,,,,,,,,,,,,,,,##",
				"########......l...l...........,f,,,,,,,,,,,,,,,,##",
				"########..................####,,,,,,,,,,,,,,,,,,##",
				"########.T.............e..####,,,,,,,,,,e,,,,a,,##",
				"########..................####,,,,,,,,,,,,,,,,,,##",
				"#########################.########################",
				"#########################.########################",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,K,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"##################################################"
			],
			legenda: {
				monstros: {
					a: "acolita",
					e: "escudeiro",
					f: "ferreiro",
					l: "lancadora"
				},
				chefes: { K: "colosso" },
				objetos: { T: "tesouro" },
				portoes: { E: {
					destino: "posto",
					rotulo: "Voltar ao Posto"
				} }
			}
		},
		{
			id: "brasa5",
			nome: "Brasa V",
			tipo: "portal",
			tema: "brasa",
			portal: "brasa5",
			chefe: {
				vida: 2.5,
				ataque: 1
			},
			linhas: [
				"####################################################",
				"#........##,,,,,,,,,,,,,,,###.....................##",
				"#.E@.....##,,,,,,,f,,,,,,,###.........c.........T.##",
				"#........##,,,,,,,,,,,,,,,###.....................##",
				"#..........,,,,a,,,,,,,,,,###.....~~~.............##",
				"#........##,,,,,,,,,,,l,,,........~~~.............##",
				"#........##,,,,,,,,,,,,,,,###..........l..........##",
				"###########,,,,,,,,,,,,,,,###.....................##",
				"###########,,,,,,,,,,,,,,,###..e..................##",
				"#############################.....................##",
				"########################################.###########",
				"########################################.###########",
				"########################################.###########",
				"########...................####,,,,,,,,,,,,,,,,,,,##",
				"########...................####,,,,,,,,,,,,,,f,,,,##",
				"########...................####,,,,,,,,,,,f,,,,,,,##",
				"########...................####,,,,,,,,,,,,,,,,,,,##",
				"########.......................,,,,,,,,,,,,,,,,,,,##",
				"########....l.......l...a..####,,,,e,,a,,,,,,,,,,,##",
				"########.T..c..............####,,,,,,,,,,,,,,,,,,,##",
				"########...................####,,,,,,,,,,,,,,,,,,,##",
				"##########################.#########################",
				"##########################.#########################",
				"##########################.#########################",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,K,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
				"####################################################"
			],
			legenda: {
				monstros: {
					a: "acolita",
					c: "caoDeEscoria",
					e: "escudeiro",
					f: "ferreiro",
					l: "lancadora"
				},
				chefes: { K: "arauto" },
				objetos: { T: "tesouro" },
				portoes: { E: {
					destino: "posto",
					rotulo: "Voltar ao Posto"
				} }
			}
		}
	].map((m) => [m.id, m])),
	itens: ITENS,
	ranks: {
		cinza: {
			id: "cinza",
			nome: "Cinza",
			descricao: "O rank mais baixo. Portais da Periferia Apagada."
		},
		brasa: {
			id: "brasa",
			nome: "Brasa",
			descricao: "Aprovado no Exame. Abre as Forjas Caídas, onde os chefes têm mecânicas."
		}
	},
	selos: Object.fromEntries([
		{
			id: "seloCarnical",
			nome: "Selo do Carniçal",
			descricao: "Do chefe da Cinza I."
		},
		{
			id: "seloRato",
			nome: "Selo do Rato-Rei",
			descricao: "Do chefe da Cinza II."
		},
		{
			id: "seloTecela",
			nome: "Selo da Tecelã",
			descricao: "Do chefe da Cinza III."
		},
		{
			id: "seloSentinela",
			nome: "Selo da Sentinela",
			descricao: "Do chefe da Cinza IV."
		},
		{
			id: "seloCavaleiro",
			nome: "Selo do Cavaleiro Oco",
			descricao: "Do chefe da Cinza V."
		},
		{
			id: "seloLimiar",
			nome: "Selo do Limiar",
			descricao: "Da Guardiã do Exame de Rank."
		},
		{
			id: "seloMatilheiro",
			nome: "Selo do Matilheiro",
			descricao: "Do chefe da Brasa I."
		},
		{
			id: "seloForjadora",
			nome: "Selo da Forjadora",
			descricao: "Do chefe da Brasa II."
		},
		{
			id: "seloCaldeira",
			nome: "Selo da Caldeira",
			descricao: "Do chefe da Brasa III."
		},
		{
			id: "seloColosso",
			nome: "Selo do Colosso",
			descricao: "Do chefe da Brasa IV."
		},
		{
			id: "seloArauto",
			nome: "Selo do Arauto",
			descricao: "Do chefe da Brasa V."
		}
	].map((s) => [s.id, s])),
	arena: ARENA,
	mapaInicial: "posto"
};
// src/engine/core/rng.ts
function createRng(seed) {
	return restoreRng(seed >>> 0);
}
function restoreRng(savedState) {
	let state = savedState >>> 0;
	const next = () => {
		state = state + 1831565813 >>> 0;
		let t = state;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
	const int = (min, max) => {
		if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) throw new RangeError(`Intervalo inválido: [${min}, ${max}]`);
		return min + Math.floor(next() * (max - min + 1));
	};
	return {
		next,
		int,
		pick(items) {
			if (items.length === 0) throw new RangeError("Não é possível sortear de uma lista vazia.");
			return items[int(0, items.length - 1)];
		},
		shuffle(items) {
			const result = [...items];
			for (let i = result.length - 1; i > 0; i--) {
				const j = int(0, i);
				[result[i], result[j]] = [result[j], result[i]];
			}
			return result;
		},
		getState: () => state
	};
}
// src/engine/definitions.ts
var MARCAS = [
	"cinzas",
	"ossos",
	"veu",
	"chama",
	"abismo"
];
// src/engine/effects/effects.ts
var HANDLERS = {
	dano(host, e, origem, escala) {
		const golpes = e.golpes ?? 1;
		for (let i = 0; i < golpes; i++) for (const alvo of host.resolveTargets(e.alvo, origem)) {
			if (host.isOver()) return;
			if (alvo.vida > 0) host.dealDamage(origem, alvo, e.mult * escala);
		}
	},
	bloqueio(host, e, origem, escala) {
		const base = (e.valor ?? 0) + (e.pctVidaMax ?? 0) * origem.unidade.vidaMax;
		const valor = Math.round(base * escala);
		for (const alvo of host.resolveTargets(e.alvo, origem)) if (alvo.vida > 0) host.gainBlock(alvo, valor);
	},
	cura(host, e, origem, escala) {
		for (const alvo of host.resolveTargets(e.alvo, origem)) if (alvo.vida > 0) host.heal(alvo, Math.round(alvo.vidaMax * e.pctVidaMax * escala));
	},
	status(host, e, origem, escala) {
		const valor = Math.max(1, Math.round(e.valor * escala));
		for (const alvo of host.resolveTargets(e.alvo, origem)) if (alvo.vida > 0) host.applyStatus(alvo, e.status, valor);
	},
	limpar(host, e, origem) {
		for (const alvo of host.resolveTargets(e.alvo, origem)) host.clearStatus(alvo, e.status);
	}
};
/**
* Executa uma lista de efeitos em ordem, parando se o combate terminar.
* `escala` multiplica a força dos efeitos (poder e nível da habilidade).
*/
function runEffects(host, efeitos, origem, escala = 1) {
	for (const efeito of efeitos) {
		if (host.isOver()) return;
		HANDLERS[efeito.tipo](host, efeito, origem, escala);
	}
}
// src/engine/statuses/statuses.ts
var STATUS_DEFS = {
	vulneravel: {
		id: "vulneravel",
		nome: "Vulnerável",
		tipo: "debuff",
		descricao: (q) => `Recebe 50% a mais de dano. Dura ${q} s.`,
		multDanoRecebido: 1.5,
		reduzPorSegundo: 1
	},
	fraco: {
		id: "fraco",
		nome: "Fraco",
		tipo: "debuff",
		descricao: (q) => `Causa 25% a menos de dano. Dura ${q} s.`,
		multDanoCausado: .75,
		reduzPorSegundo: 1
	},
	veneno: {
		id: "veneno",
		nome: "Veneno",
		tipo: "debuff",
		descricao: (q) => `Perde ${q} de vida por segundo (ignora bloqueio). Depois, reduz 1.`,
		perdaPorSegundo: (q) => q,
		reduzPorSegundo: 1
	},
	forca: {
		id: "forca",
		nome: "Força",
		tipo: "buff",
		descricao: (q) => `Cada golpe causa +${q} de dano.`,
		somaDanoCausado: (q) => q
	},
	marca: {
		id: "marca",
		nome: "Marca",
		tipo: "debuff",
		descricao: (q) => `Cada golpe recebido causa +${q} de dano. Reduz 1 por segundo.`,
		somaDanoRecebido: (q) => q,
		reduzPorSegundo: 1
	},
	queimadura: {
		id: "queimadura",
		nome: "Queimadura",
		tipo: "debuff",
		descricao: (q) => `Perde ${q} de vida por segundo (ignora bloqueio). Depois, reduz 2.`,
		perdaPorSegundo: (q) => q,
		reduzPorSegundo: 2
	}
};
/** Lista os status ativos (quantidade > 0) numa ordem estável. */
function activeStatuses(map) {
	return Object.keys(STATUS_DEFS).map((id) => [id, map[id] ?? 0]).filter(([, q]) => q > 0);
}
function addStatus(map, id, amount) {
	const next = (map[id] ?? 0) + amount;
	if (next > 0) map[id] = next;
	else delete map[id];
}
/**
* Avança um segundo: calcula a perda de vida dos status e aplica as reduções.
* Retorna as perdas, para a simulação aplicar e registrar.
*/
function tickSecond(map) {
	const perdas = [];
	for (const [id, q] of activeStatuses(map)) {
		const def = STATUS_DEFS[id];
		if (def.perdaPorSegundo) perdas.push({
			status: id,
			perda: def.perdaPorSegundo(q)
		});
		if (def.reduzPorSegundo) addStatus(map, id, -Math.min(def.reduzPorSegundo, q));
	}
	return perdas;
}
// src/engine/autobattle/damage.ts
function computeHit(origem, alvo, mult, critico) {
	let valor = origem.ataque * mult;
	for (const [id, q] of activeStatuses(origem.status)) {
		const def = STATUS_DEFS[id];
		if (def.somaDanoCausado) valor += def.somaDanoCausado(q);
	}
	for (const [id] of activeStatuses(origem.status)) {
		const m = STATUS_DEFS[id].multDanoCausado;
		if (m !== void 0) valor *= m;
	}
	for (const [id, q] of activeStatuses(alvo.status)) {
		const def = STATUS_DEFS[id];
		if (def.somaDanoRecebido) valor += def.somaDanoRecebido(q);
	}
	for (const [id] of activeStatuses(alvo.status)) {
		const m = STATUS_DEFS[id].multDanoRecebido;
		if (m !== void 0) valor *= m;
	}
	if (critico) valor *= origem.danoCritico;
	valor *= 1 - alvo.reducao;
	return Math.max(0, Math.round(valor));
}
// src/engine/arena/battle.ts
/**
* Combate da Arena: dois tabuleiros de 2 fileiras × 4 colunas lutam sozinhos.
*
* Usa o mesmo sistema de efeitos e a mesma fórmula de dano da Caçada. Cada
* unidade enche uma barra de ação com a velocidade (como no combate automático)
* e ganha mana ao atacar e ao apanhar; com a mana cheia, usa a habilidade.
*
* Determinístico: mesma semente e mesmos tabuleiros, mesmo resultado. É isso que
* vai permitir validar as lutas no servidor na Arena assíncrona.
*/
/** Quantas unidades diferentes de cada marca há no tabuleiro. */
function countMarcas(arena, tabuleiro) {
	const out = Object.fromEntries(MARCAS.map((m) => [m, 0]));
	const vistos = /* @__PURE__ */ new Set();
	for (const u of tabuleiro) {
		if (!u || vistos.has(u.def)) continue;
		vistos.add(u.def);
		const def = arena.unidades[u.def];
		if (def) for (const m of def.marcas) out[m]++;
	}
	return out;
}
/** O nível ativo de cada marca (−1 = nenhum). */
function activeMarcas(arena, tabuleiro) {
	const qtd = countMarcas(arena, tabuleiro);
	const out = {};
	for (const m of MARCAS) {
		const niveis = arena.marcas[m].niveis;
		let ativo = -1;
		niveis.forEach((n, i) => {
			if (qtd[m] >= n.qtd) ativo = i;
		});
		out[m] = ativo;
	}
	return out;
}
function addBonus(a, b) {
	if (!b) return a;
	const out = { ...a };
	for (const [k, v] of Object.entries(b)) out[k] = (out[k] ?? 0) + v;
	return out;
}
/** Monta as unidades de um lado com estrelas, marcas e herói aplicados. */
function buildFighters(content, lado, time) {
	const arena = content.arena;
	const ativos = activeMarcas(arena, lado.tabuleiro);
	let doTime = {};
	for (const m of MARCAS) {
		const nivel = arena.marcas[m].niveis[ativos[m]];
		if (nivel) doTime = addBonus(doTime, nivel.bonus);
	}
	const heroi = arena.herois[lado.heroi]?.efeito;
	doTime = addBonus(doTime, heroi?.bonus);
	const stats = content.progressao.stats;
	const out = [];
	lado.tabuleiro.forEach((inst, pos) => {
		if (!inst) return;
		const def = arena.unidades[inst.def];
		if (!def) return;
		const b = pos < arena.regras.colunas ? addBonus(doTime, heroi?.bonusFrente) : doTime;
		const mult = arena.regras.multEstrela[inst.estrelas - 1] ?? 1;
		const vidaMax = Math.round(def.vida * mult * (1 + (b.vidaPct ?? 0)));
		out.push({
			uid: `${time}:${inst.uid}`,
			defId: def.id,
			nome: def.nome,
			lado: time === 0 ? "cacador" : "inimigo",
			time,
			pos,
			vida: vidaMax,
			vidaMax,
			bloqueio: Math.round(vidaMax * (b.bloqueioPct ?? 0)),
			status: {},
			ataque: def.ataque * mult * (1 + (b.ataquePct ?? 0)),
			velocidade: def.velocidade + (b.velocidade ?? 0),
			reducao: 0,
			critico: Math.min(.75, stats.criticoBase + (b.critico ?? 0)),
			danoCritico: stats.danoCriticoBase + (b.danoCritico ?? 0),
			carga: 0,
			intencao: null,
			cicloIndice: 0,
			especialUsado: false,
			mana: Math.min(arena.regras.manaMax, b.manaInicial ?? 0),
			alcance: def.alcance,
			rouboVida: b.rouboVida ?? 0,
			queimadura: b.queimaduraAoAcertar ?? 0,
			estrelas: inst.estrelas
		});
	});
	return out;
}
function emit(ctx, e) {
	if (ctx.registrar) ctx.eventos.push({
		...e,
		t: ctx.t
	});
}
var vivo = (f) => f.vida > 0;
var coluna = (ctx, pos) => pos % ctx.content.arena.regras.colunas;
/** Alvo: a fileira da frente inimiga primeiro, na coluna mais próxima. */
function chooseTarget(ctx, f) {
	const cols = ctx.content.arena.regras.colunas;
	const inimigos = ctx.todos.filter((o) => o.time !== f.time && vivo(o));
	const frente = inimigos.filter((o) => o.pos < cols);
	const lista = frente.length > 0 ? frente : inimigos;
	const minha = coluna(ctx, f.pos);
	let melhor;
	let melhorD = Infinity;
	for (const o of lista) {
		const d = Math.abs(coluna(ctx, o.pos) - minha) * 10 + coluna(ctx, o.pos);
		if (d < melhorD) {
			melhor = o;
			melhorD = d;
		}
	}
	return melhor;
}
/** Corpo a corpo na fileira de trás só ataca quando a frente da mesma coluna cai. */
function blocked(ctx, f) {
	const cols = ctx.content.arena.regras.colunas;
	if (f.alcance > 1 || f.pos < cols) return false;
	return ctx.todos.some((o) => o.time === f.time && vivo(o) && o.pos === f.pos - cols);
}
function onDamage(ctx, alvo, perda) {
	if (perda > 0 && vivo(alvo)) alvo.mana = Math.min(ctx.content.arena.regras.manaMax, alvo.mana + ctx.content.arena.regras.manaPorDano);
	if (alvo.vida === 0) emit(ctx, {
		tipo: "caiu",
		alvo: alvo.uid
	});
}
function createHost(ctx) {
	const lado = (f, meu) => ctx.todos.filter((o) => vivo(o) && o.time === f.time === meu);
	return {
		isOver: () => false,
		resolveTargets(alvo, origem) {
			const u = origem.unidade;
			switch (alvo) {
				case "alvo": return origem.alvo && vivo(origem.alvo) ? [origem.alvo] : [];
				case "proprio": return vivo(u) ? [u] : [];
				case "inimigos": return lado(u, false);
				case "aliados": return lado(u, true);
				case "aliadoMaisFerido": {
					let melhor;
					for (const a of lado(u, true)) if (!melhor || a.vida / a.vidaMax < melhor.vida / melhor.vidaMax) melhor = a;
					return melhor ? [melhor] : [];
				}
			}
		},
		dealDamage(origem, alvo, mult) {
			const atk = origem.unidade;
			const critico = ctx.rng.next() < atk.critico;
			const valor = computeHit(atk, alvo, mult, critico);
			const bloqueado = Math.min(alvo.bloqueio, valor);
			alvo.bloqueio -= bloqueado;
			const perda = Math.min(alvo.vida, valor - bloqueado);
			alvo.vida -= perda;
			emit(ctx, {
				tipo: "dano",
				alvo: alvo.uid,
				valor: perda,
				bloqueado,
				critico
			});
			if (atk.rouboVida > 0 && vivo(atk) && perda > 0) {
				const ganho = Math.min(Math.round(perda * atk.rouboVida), atk.vidaMax - atk.vida);
				if (ganho > 0) {
					atk.vida += ganho;
					emit(ctx, {
						tipo: "cura",
						alvo: atk.uid,
						valor: ganho
					});
				}
			}
			onDamage(ctx, alvo, perda);
		},
		gainBlock(alvo, valor) {
			if (valor <= 0) return;
			alvo.bloqueio += valor;
			emit(ctx, {
				tipo: "bloqueio",
				alvo: alvo.uid,
				valor
			});
		},
		heal(alvo, valor) {
			const ganho = Math.min(valor, alvo.vidaMax - alvo.vida);
			if (ganho <= 0) return;
			alvo.vida += ganho;
			emit(ctx, {
				tipo: "cura",
				alvo: alvo.uid,
				valor: ganho
			});
		},
		applyStatus(alvo, status, valor) {
			addStatus(alvo.status, status, valor);
			emit(ctx, {
				tipo: "status",
				alvo: alvo.uid,
				status,
				valor
			});
		},
		clearStatus(alvo, status) {
			delete alvo.status[status];
		}
	};
}
function act(ctx, host, f) {
	if (blocked(ctx, f)) return;
	const alvo = chooseTarget(ctx, f);
	if (!alvo) return;
	const regras = ctx.content.arena.regras;
	const def = ctx.content.arena.unidades[f.defId];
	if (def && f.mana >= regras.manaMax) {
		f.mana = 0;
		emit(ctx, {
			tipo: "habilidade",
			origem: f.uid,
			nome: def.habilidade.nome
		});
		runEffects(host, def.habilidade.efeitos, {
			unidade: f,
			fonte: def.id,
			alvo
		});
		return;
	}
	emit(ctx, {
		tipo: "ataque",
		origem: f.uid,
		alvo: alvo.uid
	});
	host.dealDamage({
		unidade: f,
		fonte: "basico",
		alvo
	}, alvo, 1);
	if (f.queimadura > 0 && vivo(alvo)) host.applyStatus(alvo, "queimadura", f.queimadura);
	f.mana = Math.min(regras.manaMax, f.mana + regras.manaPorAtaque);
}
function frame(ctx) {
	return {
		t: ctx.t,
		u: ctx.todos.map((f) => [
			f.vida,
			f.bloqueio,
			f.mana
		])
	};
}
/** Simula uma luta completa entre dois lados. */
function simulateArenaBattle(content, a, b, semente, registrar = false) {
	const todos = [...buildFighters(content, a, 0), ...buildFighters(content, b, 1)];
	const ctx = {
		content,
		rng: createRng(semente),
		t: 0,
		todos,
		eventos: [],
		registrar
	};
	const host = createHost(ctx);
	const c = content.progressao.combate;
	const limite = content.arena.regras.limiteS * 1e3;
	const quadros = registrar ? [frame(ctx)] : [];
	const vivos = (time) => todos.some((f) => f.time === time && vivo(f));
	while (ctx.t < limite && vivos(0) && vivos(1)) {
		const segundoAntes = Math.floor(ctx.t / 1e3);
		ctx.t += c.tickMs;
		for (const f of todos) {
			if (!vivo(f)) continue;
			f.carga += f.velocidade;
			if (f.carga >= c.cargaParaAgir) {
				f.carga -= c.cargaParaAgir;
				act(ctx, host, f);
				if (!vivos(0) || !vivos(1)) break;
			}
		}
		if (Math.floor(ctx.t / 1e3) !== segundoAntes) for (const f of todos) {
			if (!vivo(f)) continue;
			for (const { status, perda } of tickSecond(f.status)) {
				const valor = Math.min(f.vida, perda);
				if (valor <= 0) continue;
				f.vida -= valor;
				emit(ctx, {
					tipo: "perdaDeVida",
					alvo: f.uid,
					valor,
					motivo: status
				});
				if (f.vida === 0) emit(ctx, {
					tipo: "caiu",
					alvo: f.uid
				});
			}
			if (f.bloqueio > 0) f.bloqueio = Math.floor(f.bloqueio * (1 - c.decaimentoBloqueio));
		}
		if (registrar) quadros.push(frame(ctx));
	}
	const restantes = (time) => todos.filter((f) => f.time === time && vivo(f)).length;
	const v0 = vivos(0);
	const v1 = vivos(1);
	return {
		vencedor: v0 && !v1 ? 0 : v1 && !v0 ? 1 : null,
		vivas: [restantes(0), restantes(1)],
		duracaoMs: ctx.t,
		unidades: todos.map((f) => ({
			uid: f.uid,
			def: f.defId,
			nome: f.nome,
			time: f.time,
			pos: f.pos,
			vidaMax: f.vidaMax,
			estrelas: f.estrelas
		})),
		eventos: ctx.eventos,
		quadros
	};
}
// src/engine/arena/match.ts
/**
* Partida da Arena: loja, ouro, níveis, banco, tabuleiro, estrelas e rodadas.
*
* Todo comando é puro: recebe a partida e devolve uma nova (ou um erro). Os
* adversários controlados pelo jogo usam as mesmas regras e o mesmo estoque.
*/
var EU = 0;
function clone(m) {
	return structuredClone(m);
}
function ok(m) {
	return { partida: m };
}
function boardCount(p) {
	return p.tabuleiro.filter(Boolean).length;
}
function xpToLevel(arena, nivel) {
	return arena.regras.xpParaNivel[nivel - 1] ?? Infinity;
}
/** Valor de venda: custo × cópias usadas (1, 3 ou 9). */
function unitValue(arena, u) {
	return (arena.unidades[u.def]?.custo ?? 1) * 3 ** (u.estrelas - 1);
}
function gainXp(arena, p, xp) {
	if (p.nivel >= arena.regras.nivelMax) return;
	p.xp += xp;
	while (p.nivel < arena.regras.nivelMax && p.xp >= xpToLevel(arena, p.nivel)) {
		p.xp -= xpToLevel(arena, p.nivel);
		p.nivel++;
	}
	if (p.nivel >= arena.regras.nivelMax) p.xp = 0;
}
function returnShop(m, p) {
	for (const id of p.loja) if (id) m.estoque[id] = (m.estoque[id] ?? 0) + 1;
	p.loja = p.loja.map(() => null);
}
function rollShop(m, arena, p, rng) {
	returnShop(m, p);
	const regras = arena.regras;
	const chances = regras.chances[p.nivel - 1] ?? regras.chances[0];
	p.loja = [];
	for (let i = 0; i < regras.tamanhoLoja; i++) {
		let r = rng.next() * 100;
		let custo = 1;
		for (let c = 0; c < chances.length; c++) {
			r -= chances[c] ?? 0;
			if (r < 0) {
				custo = c + 1;
				break;
			}
		}
		let escolhido = null;
		for (let c = custo; c >= 1 && !escolhido; c--) {
			const opcoes = Object.values(arena.unidades).filter((u) => u.custo === c && (m.estoque[u.id] ?? 0) > 0);
			const total = opcoes.reduce((s, u) => s + (m.estoque[u.id] ?? 0), 0);
			let k = rng.next() * total;
			for (const u of opcoes) {
				k -= m.estoque[u.id] ?? 0;
				if (k < 0) {
					escolhido = u.id;
					break;
				}
			}
		}
		if (escolhido) m.estoque[escolhido] = (m.estoque[escolhido] ?? 0) - 1;
		p.loja.push(escolhido);
	}
}
/** Junta 3 cópias iguais (mesma unidade, mesmas estrelas) numa versão melhor. */
function mergeAll(m, p) {
	for (let mudou = true; mudou;) {
		mudou = false;
		const grupos = /* @__PURE__ */ new Map();
		const anota = (onde, lista) => lista.forEach((u, i) => {
			if (!u || u.estrelas >= 3) return;
			const k = `${u.def}:${u.estrelas}`;
			grupos.set(k, [...grupos.get(k) ?? [], {
				onde,
				i
			}]);
		});
		anota("tabuleiro", p.tabuleiro);
		anota("banco", p.banco);
		for (const [k, lugares] of grupos) {
			if (lugares.length < 3) continue;
			const [def, estrelas] = k.split(":");
			const tres = lugares.slice(0, 3);
			for (const l of tres) p[l.onde][l.i] = null;
			const destino = tres[0];
			p[destino.onde][destino.i] = {
				uid: `u${m.proximoUid++}`,
				def,
				estrelas: Number(estrelas) + 1
			};
			mudou = true;
			break;
		}
	}
}
function player(m, id) {
	const p = m.jogadores[id];
	if (!p) throw new Error(`Jogador desconhecido: ${id}`);
	return p;
}
function createMatch(content, semente, heroi, nome, rivais = []) {
	const arena = content.arena;
	const regras = arena.regras;
	const rng = createRng(semente);
	const sombras = rivais.map((r) => sanitizeRetrato(content, r)).filter((r) => r !== null).slice(0, regras.jogadores - 1);
	const estoque = {};
	for (const u of Object.values(arena.unidades)) estoque[u.id] = regras.copias[u.custo - 1] ?? 0;
	const herois = Object.keys(arena.herois);
	const nomes = [...arena.nomesBots];
	const jogadores = [];
	for (let i = 0; i < regras.jogadores; i++) {
		const bot = i !== EU;
		const sombra = bot ? sombras[i - 1] : void 0;
		let h = bot ? herois[Math.floor(rng.next() * herois.length)] : heroi;
		const nomeBot = nomes.splice(Math.floor(rng.next() * nomes.length), 1)[0] ?? `Rival ${i}`;
		if (sombra) h = sombra.heroi;
		const efeito = arena.herois[h]?.efeito ?? {};
		jogadores.push({
			...sombra ? { sombra: sombra.times } : {},
			id: i,
			nome: sombra ? sombra.nome : bot ? nomeBot : nome,
			bot,
			heroi: h,
			vida: regras.vidaJogador + (efeito.vidaJogador ?? 0),
			ouro: (regras.renda[0] ?? 0) + (efeito.ouroInicial ?? 0),
			nivel: regras.nivelInicial,
			xp: 0,
			banco: new Array(regras.banco).fill(null),
			tabuleiro: new Array(regras.colunas * 2).fill(null),
			loja: [],
			rolagensGratis: efeito.rolagemGratis ?? 0,
			caiuNaRodada: null,
			vitorias: 0,
			derrotas: 0
		});
	}
	const m = {
		rodada: 1,
		rngState: 0,
		proximoUid: 1,
		jogadores,
		estoque,
		fim: false,
		meusTimes: []
	};
	for (const p of jogadores) if (!p.sombra) rollShop(m, arena, p, rng);
	m.rngState = rng.getState();
	return m;
}
function buyFor(m, arena, p, slot) {
	const id = p.loja[slot];
	if (!id) return "Nada para comprar aqui.";
	const def = arena.unidades[id];
	if (!def) return "Unidade desconhecida.";
	if (p.ouro < def.custo) return "Ouro insuficiente.";
	const livre = p.banco.indexOf(null);
	const iguais = [...p.banco, ...p.tabuleiro].filter((u) => u?.def === id && u.estrelas === 1);
	if (livre < 0 && iguais.length < 2) return "Banco cheio. Venda ou ponha alguém no tabuleiro.";
	p.ouro -= def.custo;
	p.loja[slot] = null;
	const novo = {
		uid: `u${m.proximoUid++}`,
		def: id,
		estrelas: 1
	};
	if (livre >= 0) p.banco[livre] = novo;
	else {
		let tirados = 0;
		let destino = null;
		for (const onde of ["tabuleiro", "banco"]) p[onde].forEach((u, i) => {
			if (tirados < 2 && u?.def === id && u.estrelas === 1) {
				p[onde][i] = null;
				destino ??= {
					onde,
					i
				};
				tirados++;
			}
		});
		if (destino) {
			const d = destino;
			p[d.onde][d.i] = {
				uid: `u${m.proximoUid++}`,
				def: id,
				estrelas: 2
			};
		}
	}
	mergeAll(m, p);
	return null;
}
function buyUnit(m, content, slot) {
	if (m.fim) return { erro: "A partida acabou." };
	const novo = clone(m);
	const erro = buyFor(novo, content.arena, player(novo, EU), slot);
	return erro ? { erro } : ok(novo);
}
function sellUnit(m, content, uid) {
	if (m.fim) return { erro: "A partida acabou." };
	const novo = clone(m);
	const p = player(novo, EU);
	for (const onde of ["banco", "tabuleiro"]) {
		const i = p[onde].findIndex((u) => u?.uid === uid);
		if (i < 0) continue;
		const u = p[onde][i];
		p.ouro += unitValue(content.arena, u);
		novo.estoque[u.def] = (novo.estoque[u.def] ?? 0) + 3 ** (u.estrelas - 1);
		p[onde][i] = null;
		return ok(novo);
	}
	return { erro: "Unidade não encontrada." };
}
function rerollFor(m, arena, p, rng) {
	if (p.rolagensGratis > 0) p.rolagensGratis--;
	else if (p.ouro < arena.regras.custoRolar) return "Ouro insuficiente.";
	else p.ouro -= arena.regras.custoRolar;
	rollShop(m, arena, p, rng);
	return null;
}
function rerollShop(m, content) {
	if (m.fim) return { erro: "A partida acabou." };
	const novo = clone(m);
	const rng = restoreRng(novo.rngState);
	const erro = rerollFor(novo, content.arena, player(novo, EU), rng);
	if (erro) return { erro };
	novo.rngState = rng.getState();
	return ok(novo);
}
function buyXpFor(arena, p) {
	if (p.nivel >= arena.regras.nivelMax) return "Nível máximo.";
	if (p.ouro < arena.regras.custoXp) return "Ouro insuficiente.";
	p.ouro -= arena.regras.custoXp;
	gainXp(arena, p, arena.regras.xpPorCompra);
	return null;
}
function buyXp(m, content) {
	if (m.fim) return { erro: "A partida acabou." };
	const novo = clone(m);
	const erro = buyXpFor(content.arena, player(novo, EU));
	return erro ? { erro } : ok(novo);
}
/** Move (ou troca) uma unidade entre banco e tabuleiro. */
function moveUnit(m, content, uid, destino) {
	if (m.fim) return { erro: "A partida acabou." };
	const novo = clone(m);
	const p = player(novo, EU);
	let origem = null;
	for (const onde of ["banco", "tabuleiro"]) {
		const i = p[onde].findIndex((u) => u?.uid === uid);
		if (i >= 0) origem = {
			onde,
			i
		};
	}
	if (!origem) return { erro: "Unidade não encontrada." };
	if (destino.i < 0 || destino.i >= p[destino.onde].length) return { erro: "Lugar inválido." };
	const a = p[origem.onde][origem.i] ?? null;
	const b = p[destino.onde][destino.i] ?? null;
	if (origem.onde === "banco" && destino.onde === "tabuleiro" && !b) {
		if (boardCount(p) >= p.nivel) return { erro: `No nível ${p.nivel}, cabem ${p.nivel} unidades no tabuleiro.` };
	}
	p[origem.onde][origem.i] = b;
	p[destino.onde][destino.i] = a;
	return ok(novo);
}
function favoriteMarca(arena, p) {
	const todos = [...p.tabuleiro, ...p.banco];
	if (!todos.some(Boolean)) return null;
	const qtd = countMarcas(arena, todos);
	let melhor = null;
	for (const [mId, q] of Object.entries(qtd)) if (!melhor || q > qtd[melhor]) melhor = mId;
	return melhor;
}
/** Põe as melhores unidades no tabuleiro: corpo a corpo na frente, à distância atrás. */
function arrangeBoard(arena, p) {
	const todas = [...p.tabuleiro, ...p.banco].filter((u) => !!u);
	const valor = (u) => u.estrelas * 10 + (arena.unidades[u.def]?.custo ?? 0);
	todas.sort((a, b) => valor(b) - valor(a));
	const noCampo = todas.slice(0, p.nivel);
	const resto = todas.slice(p.nivel);
	const cols = arena.regras.colunas;
	p.tabuleiro = new Array(cols * 2).fill(null);
	const frente = noCampo.filter((u) => (arena.unidades[u.def]?.alcance ?? 1) <= 1);
	const tras = noCampo.filter((u) => (arena.unidades[u.def]?.alcance ?? 1) > 1);
	const ordem = [
		1,
		2,
		0,
		3
	];
	const por = (lista, linha, sobra) => {
		for (const u of lista) {
			const col = ordem.find((c) => !p.tabuleiro[linha * cols + c]);
			if (col === void 0) sobra.push(u);
			else p.tabuleiro[linha * cols + col] = u;
		}
	};
	const sobra = [];
	por(frente, 0, sobra);
	por(tras, 1, sobra);
	const sobra2 = [];
	por(sobra, 0, sobra2);
	por(sobra2, 1, []);
	p.banco = new Array(arena.regras.banco).fill(null);
	resto.slice(0, arena.regras.banco).forEach((u, i) => p.banco[i] = u);
}
function botTurn(m, arena, p, rng) {
	const regras = arena.regras;
	while (p.nivel < regras.nivelMax && p.ouro >= regras.custoXp + 12 && m.rodada >= 3) buyXpFor(arena, p);
	for (let rolagens = 0; rolagens < 4; rolagens++) {
		const fav = favoriteMarca(arena, p);
		const temQtd = (id) => [...p.banco, ...p.tabuleiro].filter((u) => u?.def === id).length;
		for (let s = 0; s < p.loja.length; s++) {
			const id = p.loja[s];
			if (!id) continue;
			const def = arena.unidades[id];
			if (!def) continue;
			const unidades = [...p.banco, ...p.tabuleiro].filter(Boolean).length;
			if ((temQtd(id) > 0 || fav !== null && def.marcas.includes(fav) || unidades < p.nivel + 1 || rng.next() < .15) && p.ouro >= def.custo) {
				if (buyFor(m, arena, p, s)) {
					const i = p.banco.reduce((melhor, u, k) => u && (melhor < 0 || unitValue(arena, u) < unitValue(arena, p.banco[melhor])) ? k : melhor, -1);
					if (i >= 0) {
						const u = p.banco[i];
						p.ouro += unitValue(arena, u);
						m.estoque[u.def] = (m.estoque[u.def] ?? 0) + 3 ** (u.estrelas - 1);
						p.banco[i] = null;
						buyFor(m, arena, p, s);
					}
				}
			}
		}
		const reserva = Math.min(regras.jurosCada * regras.jurosMax, m.rodada * 3);
		if (p.ouro - regras.custoRolar < reserva && p.rolagensGratis <= 0) break;
		rerollFor(m, arena, p, rng);
	}
	arrangeBoard(arena, p);
}
function alive(m) {
	return m.jogadores.filter((p) => p.caiuNaRodada === null);
}
/** Pares da rodada: rodízio entre os vivos; com número ímpar, alguém enfrenta um fantasma. */
function pairings(m, rng) {
	const vivos = alive(m).map((p) => p.id);
	const n = vivos.length;
	if (n < 2) return [];
	const lista = n % 2 === 0 ? [...vivos] : [...vivos, -1];
	const k = lista.length;
	const giro = (m.rodada - 1) % (k - 1);
	const fixos = lista[0];
	const roda = lista.slice(1);
	const rodada = [
		fixos,
		...roda.slice(giro),
		...roda.slice(0, giro)
	];
	const pares = [];
	for (let i = 0; i < k / 2; i++) {
		const a = rodada[i];
		const b = rodada[k - 1 - i];
		if (a === -1 || b === -1) {
			const sozinho = a === -1 ? b : a;
			const outros = vivos.filter((v) => v !== sozinho);
			pares.push([
				sozinho,
				outros[Math.floor(rng.next() * outros.length)],
				true
			]);
		} else pares.push([
			a,
			b,
			false
		]);
	}
	return pares;
}
function side(p) {
	return {
		tabuleiro: p.tabuleiro,
		heroi: p.heroi
	};
}
/** Fecha a rodada: adversários jogam, todas as lutas acontecem, vem a renda da próxima. */
function endRound(m, content) {
	if (m.fim) return { erro: "A partida acabou." };
	const arena = content.arena;
	const regras = arena.regras;
	const novo = clone(m);
	const rng = restoreRng(novo.rngState);
	for (const p of alive(novo)) if (p.sombra) p.tabuleiro = shadowBoard(p.sombra, novo.rodada, regras.colunas * 2);
	else if (p.bot) botTurn(novo, arena, p, rng);
	(novo.meusTimes ??= []).push(structuredClone(player(novo, EU).tabuleiro));
	const relatorio = {
		rodada: novo.rodada,
		lutas: [],
		minha: null
	};
	for (const [a, b, fantasma] of pairings(novo, rng)) {
		const pa = player(novo, a);
		const pb = player(novo, b);
		const minha = a === EU || b === EU && !fantasma;
		const batalha = simulateArenaBattle(content, side(pa), side(pb), Math.floor(rng.next() * 2 ** 31), minha);
		const dano = (vivas) => regras.danoBase + vivas + Math.floor(novo.rodada / 5);
		const luta = {
			a,
			b,
			fantasma,
			vencedor: batalha.vencedor,
			danoA: batalha.vencedor === 0 ? 0 : batalha.vencedor === 1 ? dano(batalha.vivas[1]) : regras.danoBase,
			danoB: fantasma || batalha.vencedor === 1 ? 0 : batalha.vencedor === 0 ? dano(batalha.vivas[0]) : regras.danoBase
		};
		pa.vida -= luta.danoA;
		if (!fantasma) pb.vida -= luta.danoB;
		if (batalha.vencedor === 0) {
			pa.vitorias++;
			pa.ouro += regras.bonusVitoria;
			if (!fantasma) pb.derrotas++;
		} else {
			pa.derrotas++;
			if (batalha.vencedor === 1 && !fantasma) {
				pb.vitorias++;
				pb.ouro += regras.bonusVitoria;
			}
		}
		relatorio.lutas.push(luta);
		if (minha) relatorio.minha = {
			luta,
			batalha,
			souA: a === EU
		};
	}
	for (const p of novo.jogadores) if (p.caiuNaRodada === null && p.vida <= 0) {
		p.vida = 0;
		p.caiuNaRodada = novo.rodada;
	}
	const vivos = alive(novo);
	if (vivos.length <= 1 || player(novo, EU).caiuNaRodada !== null || novo.rodada >= regras.rodadasMax) {
		novo.fim = true;
		novo.rngState = rng.getState();
		return {
			partida: novo,
			relatorio
		};
	}
	novo.rodada++;
	const renda = regras.renda[Math.min(novo.rodada - 1, regras.renda.length - 1)] ?? 0;
	for (const p of vivos) {
		const efeito = arena.herois[p.heroi]?.efeito ?? {};
		const juros = Math.min(regras.jurosMax, Math.floor(p.ouro / regras.jurosCada));
		p.ouro += renda + juros;
		gainXp(arena, p, regras.xpPorRodada + (efeito.xpExtra ?? 0));
		p.rolagensGratis = efeito.rolagemGratis ?? 0;
		if (!p.sombra) rollShop(novo, arena, p, rng);
	}
	novo.rngState = rng.getState();
	return {
		partida: novo,
		relatorio
	};
}
/** Classificação: quem caiu por último fica à frente; empate, mais vida. */
function standings(m) {
	return [...m.jogadores].sort((a, b) => {
		const ca = a.caiuNaRodada ?? Infinity;
		const cb = b.caiuNaRodada ?? Infinity;
		if (ca !== cb) return cb - ca;
		return b.vida - a.vida;
	});
}
function placement(m) {
	return standings(m).findIndex((p) => p.id === EU) + 1;
}
/** O time da sombra na rodada; depois do último gravado, repete o último. */
function shadowBoard(times, rodada, tamanho) {
	const t = times[Math.min(rodada, times.length) - 1] ?? [];
	const tab = new Array(tamanho).fill(null);
	t.forEach((u, i) => {
		if (u && i < tamanho) tab[i] = {
			...u,
			uid: `s${i}`
		};
	});
	return tab;
}
/**
* Confere um retrato vindo de fora: unidades que existem, estrelas de 1 a 3 e
* no máximo o tamanho de time do nível máximo. Devolve null se não servir.
*/
function sanitizeRetrato(content, r) {
	const arena = content.arena;
	const regras = arena.regras;
	if (typeof r !== "object" || r === null) return null;
	const o = r;
	if (typeof o.nome !== "string" || typeof o.heroi !== "string" || !arena.herois[o.heroi]) return null;
	if (!Array.isArray(o.times) || o.times.length === 0 || o.times.length > regras.rodadasMax) return null;
	const times = [];
	for (const t of o.times) {
		if (!Array.isArray(t) || t.length > regras.colunas * 2) return null;
		const time = [];
		for (const u of t) {
			if (u === null) {
				time.push(null);
				continue;
			}
			if (typeof u !== "object") return null;
			const x = u;
			if (typeof x.def !== "string" || !arena.unidades[x.def]) return null;
			if (x.estrelas !== 1 && x.estrelas !== 2 && x.estrelas !== 3) return null;
			time.push({
				uid: "x",
				def: x.def,
				estrelas: x.estrelas
			});
		}
		if (time.filter(Boolean).length > regras.nivelMax) return null;
		times.push(time);
	}
	return {
		...typeof o.id === "number" && Number.isInteger(o.id) ? { id: o.id } : {},
		nome: o.nome.slice(0, 20),
		heroi: o.heroi,
		times
	};
}
/** O retrato do jogador numa partida, pronto para ser rival de outros. */
function myRetrato(m) {
	const eu = player(m, EU);
	if (!m.meusTimes || m.meusTimes.length === 0) return null;
	return {
		nome: eu.nome,
		heroi: eu.heroi,
		times: m.meusTimes.map((t) => t.map((u) => u ? {
			uid: "x",
			def: u.def,
			estrelas: u.estrelas
		} : null))
	};
}
// src/engine/arena/replay.ts
function applyCommand(m, content, c) {
	switch (c.t) {
		case "comprar": return buyUnit(m, content, c.slot);
		case "vender": return sellUnit(m, content, c.uid);
		case "rolar": return rerollShop(m, content);
		case "xp": return buyXp(m, content);
		case "mover": return moveUnit(m, content, c.uid, c.destino);
		case "lutar": return endRound(m, content);
	}
}
/** Refaz a partida do começo. Qualquer comando recusado invalida tudo. */
function replayMatch(content, inicio, comandos) {
	if (!content.arena.herois[inicio.heroi]) return { erro: "Herói desconhecido." };
	let m = createMatch(content, inicio.semente, inicio.heroi, inicio.nome, inicio.rivais);
	for (const [i, c] of comandos.entries()) {
		if (m.fim) return { erro: `Comando ${i + 1} depois do fim da partida.` };
		const r = applyCommand(m, content, c);
		if (r.erro !== void 0) return { erro: `Comando ${i + 1} recusado: ${r.erro}` };
		m = r.partida;
	}
	if (!m.fim) return { erro: "A partida não terminou." };
	return {
		partida: m,
		lugar: placement(m),
		retrato: myRetrato(m)
	};
}
// tools/edge/motor.ts
/**
* O pedaço do motor que o servidor usa para conferir partidas da Arena.
* `npm run edge` empacota este arquivo em supabase/functions/arena-registrar/motor.js.
*/
function conferir(semente, heroi, rivais, comandos) {
	if (typeof semente !== "number" || !Number.isInteger(semente)) return { erro: "Semente inválida." };
	if (typeof heroi !== "string") return { erro: "Herói inválido." };
	if (!Array.isArray(comandos) || comandos.length > 5e3) return { erro: "Comandos inválidos." };
	const limpos = [];
	for (const r of rivais) {
		const x = sanitizeRetrato(CONTEUDO, r);
		if (!x) return { erro: "Rival inválido." };
		limpos.push(x);
	}
	const r = replayMatch(CONTEUDO, {
		semente,
		heroi,
		nome: "Você",
		rivais: limpos
	}, comandos);
	if (r.erro !== void 0) return { erro: r.erro };
	return {
		lugar: r.lugar,
		gloria: CONTEUDO.arena.regras.gloria[r.lugar - 1] ?? 0,
		retrato: r.retrato
	};
}
var HEROIS = Object.keys(CONTEUDO.arena.herois);
export { HEROIS, conferir };
