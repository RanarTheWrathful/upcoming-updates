exports.Quake
exports.repeater
//--------------------------------------------------\\
exports.Doomwark = {
  PARENT: [exports.genericTank],
  DANGER: 7,
  NAME: "Doomwark",
  LABEL: "HL-Amalgamation",
  BODY: {
    HEALTH: base.HEALTH * 200,
    DAMAGE: base.DAMAGE * 1.1,
    ACCEL: base.ACCEL * 0.8,
  },
  TURRETS: [
    {
      POSITION: [12, 7, 0, 90, 360, 1],
      TYPE: exports.autoWarkTurret,
    },
    {
      POSITION: [12, 7, 0, -90, 360, 1],
      TYPE: exports.autoWarkTurret,
    },
  ],
  GUNS: [
  {
      /**** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
      POSITION: [5, 11, 1, 10.5, 0, 0, 0],
    },
    {
      POSITION: [2, 14, 1, 15.5, 0, 0, 0],
      PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.spawner, g.factory, g.superHealth]),
        TYPE: exports.minion_warkspawner,
        STAT_CALCULATOR: gunCalcNames.drone,
        AUTOFIRE: true,
        SYNCS_SKILLS: true,
      },
    },
    {
      POSITION: [4, 14, 1, 8, 0, 0, 0],
    },
    {
      /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
      POSITION: [20, 8, 1, 0, 5.5, 0, 0],
      PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.uberDamage, g.superSpeed]),
        TYPE: exports.bullet,
      },
    },
    {
      POSITION: [20, 8, 1, 0, -5.5, 0, 0.5],
      PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.uberDamage, g.superSpeed]),
        TYPE: exports.bullet,
      },
    },
    {
      POSITION: [15, 8, 1, 0, 5.5, 185, 0],
    },
    {
      POSITION: [3, 8, 1.7, 14, 5.5, 185, 0],
      PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.trap]),
        TYPE: exports.trap,
        STAT_CALCULATOR: gunCalcNames.trap,
      },
    },

    {
    POSITION: [15, 8, 1, 0, 5.5, 180, 0],
    },
    {
      POSITION: [3, 8, 1.7, 14, 5.5, 185, 0],
      PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.trap]),
        TYPE: exports.trap,
        STAT_CALCULATOR: gunCalcNames.trap,
      },
    },

    {
      POSITION: [15, 8, 1, 0, -5.5, 175, 0.5],
    },
    {
      POSITION: [3, 8, 1.7, 14, -5.5, 175, 0.5],
      PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.trap]),
        TYPE: exports.trap,
        STAT_CALCULATOR: gunCalcNames.trap,
      },
    },
  ],
};
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
exports.dominator_underseer = makeMulti(
  {
  PARENT: [exports.dominator],
  FACING_TYPE: "autospin",
  GUNS: [
      {
        /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [3, 8, 1.2, 7, 0, 90, 0],
        PROPERTIES: {
          SHOOT_SETTINGS: combineStats([g.sunchip]),
          TYPE: [exports.sunchip],
          AUTOFIRE: true,
          MAX_CHILDREN: 3,
          SYNCS_SKILLS: true,
          STAT_CALCULATOR: gunCalcNames.necro,
        },
      },
  ],
},
  6,
  "Dominator"
);