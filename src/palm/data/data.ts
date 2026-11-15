import { Palm } from "../modal/modal";

export const BasicCards: Record<string, Palm.Card> = {
    1: {
        1: {
            produce: {
                gain: { Fish: 1 }
            },
            rotate: {
                cons: [{ Fish: 1 }]
            },
            flip: {
                cons: [{ Fish: 1 }]
            }
        },
        2: {
            produce: {
                gain: { Fish: 2 }
            },
            flip: {
                cons: [{ Fish: 1, Log: 1 }]
            }
        },
        3: {
            produce: {
                gain: { Fish: 1, Log: 1 }
            },
            rotate: {
                cons: [{ Fish: 1, Log: 1 }]
            }
        },
        4: {
            produce: {
                gain: { Fish: 2, Log: 1 }
            }
        }
    },
    2: {
        1: {
            produce: {
                gain: { Fish: 1 }
            },
            rotate: {
                cons: [{ Fish: 1 }]
            },
            flip: {
                cons: [{ Fish: 1 }]
            }
        },
        2: {
            produce: {
                gain: { Fish: 2 }
            },
            flip: {
                cons: [{ Fish: 1, Log: 1 }]
            }
        },
        3: {
            produce: {
                gain: { Fish: 1, Log: 1 }
            },
            rotate: {
                cons: [{ Fish: 1, Log: 1 }]
            }
        },
        4: {
            produce: {
                gain: { Fish: 2, Log: 1 }
            }
        }
    },
    3: {
        1: {
            produce: {
                gain: { Fish: 1 }
            },
            rotate: {
                cons: [{ Fish: 1 }]
            },
            flip: {
                cons: [{ Fish: 1 }]
            }
        },
        2: {
            produce: {
                gain: { Fish: 2 }
            },
            flip: {
                cons: [{ Fish: 1, Log: 1 }]
            }
        },
        3: {
            produce: {
                gain: { Fish: 1, Log: 1 }
            },
            rotate: {
                cons: [{ Fish: 1, Log: 1 }]
            }
        },
        4: {
            produce: {
                gain: { Fish: 2, Log: 1 }
            }
        }
    },
    4: {
        1: {
            produce: {
                gain: { Log: 1 }
            },
            rotate: {
                cons: [{ Fish: 1, Log: 1 }]
            }
        },
        2: {
            produce: {
                gain: { Log: 1 }
            },
            repu: 1,
            flip: {
                cons: [{ Rock: 1, Log: 1 }]
            }
        },
        3: {
            repu: 5
        },
        4: {
            produce: {
                gain: { Log: 1 }
            },
            repu: 2,
            rotate: {
                cons: [{ Rock: 2, Log: 2 }]
            }
        }
    },
    5: {
        1: {
            produce: {
                gain: { Log: 1 }
            },
            rotate: {
                cons: [{ Fish: 1, Log: 1 }]
            }
        },
        2: {
            produce: {
                gain: { Log: 1 }
            },
            repu: 1,
            flip: {
                cons: [{ Rock: 1, Log: 1 }]
            }
        },
        3: {
            repu: 5
        },
        4: {
            produce: {
                gain: { Log: 1 }
            },
            repu: 2,
            rotate: {
                cons: [{ Rock: 2, Log: 2 }]
            }
        }
    },
    6: {
        1: {
            produce: {
                gain: { Log: 1 }
            },
            rotate: {
                cons: [{ Fish: 1, Log: 1 }]
            }
        },
        2: {
            produce: {
                gain: { Log: 1 }
            },
            repu: 1,
            flip: {
                cons: [{ Rock: 1, Log: 1 }]
            }
        },
        3: {
            repu: 5
        },
        4: {
            produce: {
                gain: { Log: 1 }
            },
            repu: 2,
            rotate: {
                cons: [{ Rock: 2, Log: 2 }]
            }
        }
    },
    7: {
        1: {
            rotate: {
                cons: [{ Log: 2 }]
            },
            flip: {
                cons: [{ Fish: 2 }]
            }
        },
        2: {
            produce: {
                gain: { Rock: 1 }
            },
            flip: {
                cons: [{ Fish: 1, Log: 2 }]
            }
        },
        3: {
            produce: {
                gain: { Rock: 1 }
            },
            rotate: {
                cons: [{ Fish: 2, Log: 1 }]
            }
        },
        4: {
            produce: {
                gain: { Rock: 2 }
            },
            repu: 2
        }
    },
    8: {
        1: {
            rotate: {
                cons: [{ Log: 2 }]
            },
            flip: {
                cons: [{ Fish: 2 }]
            }
        },
        2: {
            produce: {
                gain: { Rock: 1 }
            },
            flip: {
                cons: [{ Fish: 1, Log: 2 }]
            }
        },
        3: {
            produce: {
                gain: { Rock: 1 }
            },
            rotate: {
                cons: [{ Fish: 2, Log: 1 }]
            }
        },
        4: {
            produce: {
                gain: { Rock: 2 }
            },
            repu: 2
        }
    },
    9: {
        1: {
            rotate: {
                cons: [{ Log: 2 }]
            },
            flip: {
                cons: [{ Fish: 2 }]
            }
        },
        2: {
            produce: {
                gain: { Rock: 1 }
            },
            flip: {
                cons: [{ Fish: 1, Log: 2 }]
            }
        },
        3: {
            produce: {
                gain: { Rock: 1 }
            },
            rotate: {
                cons: [{ Fish: 2, Log: 1 }]
            }
        },
        4: {
            produce: {
                gain: { Rock: 2 }
            },
            repu: 2
        }
    },
    10: {
        1: {
            produce: {
                gain: { Rock: 1 }, cons: [{ Log: 1 }, { Fish: 1 }]
            },
            rotate: {
                cons: [{ Log: 2 }]
            },
            flip: {
                cons: [{ Fish: 2 }]
            }
        },
        2: {
            produce: {
                gain: { Rock: 1, Fish: 1 }, cons: [{ Log: 1 }]
            },
            flip: {
                cons: [{ Rock: 1, Log: 1 }]
            }
        },
        3: {
            produce: {
                gain: { Rock: 1, Log: 1 }, cons: [{ Fish: 1 }]
            },
            rotate: {
                cons: [{ Rock: 1, Fish: 1 }]
            }
        },
        4: {
            produce: {
                gain: { Rock: 1, Fish: 1, Log: 1 }, cons: [{ Rock: 1 }, { Fish: 1 }, { Log: 1 }]
            }
        }
    },
    11: {
        1: {
            produce: {
                gain: { Fish: 1, Log: 1 }, cons: [{ Fish: 2 }, { Log: 2 }]
            },
            rotate: {
                cons: [{ Fish: 1 }]
            },
            flip: {
                cons: [{ Log: 1 }]
            }
        },
        2: {
            produce: {
                gain: { Log: 3 }, cons: [{ Fish: 2 }, { Log: 2 }]
            },
            flip: {
                cons: [{ Fish: 1, Log: 1 }]
            }
        },
        3: {
            produce: {
                gain: { Fish: 3 }, cons: [{ Log: 2 }, { Rock: 2 }]
            },
            rotate: {
                cons: [{ Fish: 1, Log: 1 }]
            }
        },
        4: {
            produce: {
                gain: { Rock: 3 }, cons: [{ Fish: 2 }, { Log: 2 }]
            },
            rotate: {
                cons: [{ Rock: 1 }]
            },
            flip: {
                cons: [{ Rock: 1 }]
            }
        }
    },
    12: {
        1: {
            rotate: {
                cons: [{ Rock: 2, Fish: 1, Log: 1 }]
            },
            flip: {
                cons: [{ Fish: 1, Log: 1 }]
            }
        },
        2: {
            repu: 4
        },
        3: {
            produce: {
                gain: { Fish: 1, Log: 1 }
            },
            rotate: {
                cons: [{ Rock: 1, Fish: 1, Log: 1 }]
            }
        },
        4: {
            produce: {
                gain: { Rock: 1, Fish: 1, Log: 1 }
            },
            flip: {
                cons: [{ Rock: 2, Fish: 2, Log: 2 }]
            }
        }
    },
    13: {
        1: {
            rotate: {
                cons: [{ Fish: 1, Log: 1 }]
            }
        },
        2: {
            repu: 1,
            flip: {
                cons: [{ Rock: 1, Fish: 1, Log: 1 }]
            }
        },
        3: {
            repu: 6
        },
        4: {
            repu: 3,
            rotate: {
                cons: [{ Rock: 2, Fish: 2, Log: 2 }]
            }
        }
    },
    14: {
        1: {
            rotate: {
                cons: [{ Fish: 1, Log: 1 }]
            }
        },
        2: {
            repu: 1,
            flip: {
                cons: [{ Rock: 1, Fish: 1, Log: 1 }]
            }
        },
        3: {
            repu: 6
        },
        4: {
            repu: 3,
            rotate: {
                cons: [{ Rock: 2, Fish: 2, Log: 2 }]
            }
        }
    },
    15: {
        1: {
            rotate: {
                cons: [{ Rock: 2, Fish: 1, Log: 1 }]
            }
        },
        2: {
            repu: 3,
            flip: {
                cons: [{ Rock: 3, Fish: 2, Log: 2 }]
            }
        },
        3: {
            repu: 10
        },
        4: {
            repu: 6,
            rotate: {
                cons: [{ Rock: 4, Fish: 3, Log: 3 }]
            }
        }
    },
    16: {
        1: {
            rotate: {
                cons: [{ Rock: 2, Fish: 1, Log: 1 }]
            }
        },
        2: {
            repu: 3,
            flip: {
                cons: [{ Rock: 3, Fish: 2, Log: 2 }]
            }
        },
        3: {
            repu: 10
        },
        4: {
            repu: 6,
            rotate: {
                cons: [{ Rock: 4, Fish: 3, Log: 3 }]
            }
        }
    }
};

/** 基础建筑牌印在木牌上的名字（供日志、牌库列表与开局效果选择使用） */
export const BasicCardNames: Record<number, string> = {
    1: "船屋",
    2: "船屋",
    3: "船屋",
    4: "樵夫",
    5: "樵夫",
    6: "樵夫",
    7: "采石场",
    8: "采石场",
    9: "采石场",
    10: "集市",
    11: "货栈",
    12: "仓库",
    13: "房屋",
    14: "房屋",
    15: "神殿",
    16: "神殿"
};
