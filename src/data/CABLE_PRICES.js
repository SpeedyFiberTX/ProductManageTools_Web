// === 線材每米單價（Cable with Corning fiber，USD / meter） ===
// key: Jacket -> FiberType(Simplex/Duplex/Round) -> FiberMode(SM/M1~M5)

export const CABLE_PRICES = {
    // 第一組：OFNR ClearCurve
    OFNR: {
        Simplex: {
            SM: 0.06,
            M1: 0.16,
            M2: 0.09,
            M3: 0.11,
            M4: 0.19,
            M5: 0.56,
        },
        Duplex: {
            SM: 0.12,
            M1: 0.32,
            M2: 0.18,
            M3: 0.22,
            M4: 0.38,
            M5: 1.12,
        },
        Round: {
            SM: 0.08,
            M1: 0.28,
            M2: 0.15,
            M3: 0.17,
            M4: 0.32,
            M5: 1.09,
        },
    },
    // 第二組：OFNP ClearCurve
    OFNP: {
        Simplex: {
            SM: 0.22,
            M1: 0.28,
            M2: 0.25,
            M3: 0.27,
            M4: 0.35,
            M5: 0.68,
        },
        Duplex: {
            SM: 0.44,
            M1: 0.56,
            M2: 0.5,
            M3: 0.54,
            M4: 0.7,
            M5: 1.36,
        },
        Round: {
            SM: 0.21,
            M1: 0.4,
            M2: 0.27,
            M3: 0.29,
            M4: 0.44,
            M5: 1.21,
        },
    },
    // 第三組：LSZH ClearCurve
    LSZH: {
        Simplex: {
            SM: 0.06,
            M1: 0.15,
            M2: 0.1,
            M3: 0.12,
            M4: 0.2,
            M5: 0.52,
        },
        Duplex: {
            SM: 0.12,
            M1: 0.3,
            M2: 0.2,
            M3: 0.24,
            M4: 0.4,
            M5: 1.04,
        },
        Round: {
            SM: 0.09,
            M1: 0.28,
            M2: 0.15,
            M3: 0.17,
            M4: 0.32,
            M5: 1.09,
        },
    },
};