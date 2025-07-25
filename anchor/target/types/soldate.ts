/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/soldate.json`.
 */
export type Soldate = {
  "address": "yeyAtDe631iSoW5CYpb7tiGjiAtmNGk8eWnw4R2ZbU7",
  "metadata": {
    "name": "soldate",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "blockUser",
      "discriminator": [
        10,
        164,
        178,
        6,
        231,
        175,
        185,
        191
      ],
      "accounts": [
        {
          "name": "blocker",
          "writable": true,
          "signer": true
        },
        {
          "name": "block",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "blocker"
              },
              {
                "kind": "arg",
                "path": "blockedUser"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "blockedUser",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "createMatch",
      "discriminator": [
        107,
        2,
        184,
        145,
        70,
        142,
        17,
        165
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "user1"
              },
              {
                "kind": "arg",
                "path": "user2"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "user1",
          "type": "pubkey"
        },
        {
          "name": "user2",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "createProfile",
      "discriminator": [
        225,
        205,
        234,
        143,
        17,
        186,
        50,
        220
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "age",
          "type": "u8"
        },
        {
          "name": "bio",
          "type": "string"
        },
        {
          "name": "interests",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "location",
          "type": "string"
        }
      ]
    },
    {
      "name": "sendLike",
      "discriminator": [
        72,
        156,
        138,
        218,
        124,
        229,
        126,
        12
      ],
      "accounts": [
        {
          "name": "sender",
          "writable": true,
          "signer": true
        },
        {
          "name": "like",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "sender"
              },
              {
                "kind": "arg",
                "path": "timestamp"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "timestamp",
          "type": "i64"
        },
        {
          "name": "targetUser",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "sendMessage",
      "discriminator": [
        57,
        40,
        34,
        178,
        189,
        10,
        65,
        26
      ],
      "accounts": [
        {
          "name": "sender",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "match_account.user1",
                "account": "match"
              },
              {
                "kind": "account",
                "path": "match_account.user2",
                "account": "match"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "content",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateProfile",
      "discriminator": [
        98,
        67,
        99,
        206,
        86,
        115,
        175,
        1
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": {
            "option": "string"
          }
        },
        {
          "name": "age",
          "type": {
            "option": "u8"
          }
        },
        {
          "name": "bio",
          "type": {
            "option": "string"
          }
        },
        {
          "name": "interests",
          "type": {
            "option": {
              "vec": "string"
            }
          }
        },
        {
          "name": "location",
          "type": {
            "option": "string"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "blockedUser",
      "discriminator": [
        213,
        76,
        73,
        104,
        254,
        169,
        234,
        232
      ]
    },
    {
      "name": "like",
      "discriminator": [
        10,
        133,
        129,
        201,
        87,
        218,
        203,
        222
      ]
    },
    {
      "name": "match",
      "discriminator": [
        236,
        63,
        169,
        38,
        15,
        56,
        196,
        162
      ]
    },
    {
      "name": "userProfile",
      "discriminator": [
        32,
        37,
        119,
        205,
        179,
        180,
        13,
        194
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6001,
      "name": "nameTooLong",
      "msg": "Name is too long"
    },
    {
      "code": 6002,
      "name": "ageTooYoung",
      "msg": "User must be at least 18 years old"
    },
    {
      "code": 6003,
      "name": "bioTooLong",
      "msg": "Bio is too long"
    },
    {
      "code": 6004,
      "name": "messageTooLong",
      "msg": "Message is too long"
    },
    {
      "code": 6005,
      "name": "matchNotActive",
      "msg": "Match not active"
    }
  ],
  "types": [
    {
      "name": "blockedUser",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "blocker",
            "type": "pubkey"
          },
          {
            "name": "blocked",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "like",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "receiver",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "isMatch",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "match",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user1",
            "type": "pubkey"
          },
          {
            "name": "user2",
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "messages",
            "type": {
              "vec": {
                "defined": {
                  "name": "message"
                }
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "message",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "content",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "userProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "age",
            "type": "u8"
          },
          {
            "name": "bio",
            "type": "string"
          },
          {
            "name": "interests",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "location",
            "type": "string"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "matches",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
