export const defaultDurationMatrix = {
  timeGridMinutes: 15,
  services: [
    "női hajvágás",
    "festés",
    "melír",
    "szárítás",
    "gyermek hajvágás",
    "férfi hajvágás",
    "balayage"
  ],
  durations: {
    "rövid": {
      "ritka": {
        "női hajvágás": 30,
        "festés": 60,
        "melír": 75,
        "szárítás": 20,
        "gyermek hajvágás": 20,
        "férfi hajvágás": 20,
        "balayage": 90
      },
      "normál": {
        "női hajvágás": 45,
        "festés": 75,
        "melír": 90,
        "szárítás": 30,
        "gyermek hajvágás": 25,
        "férfi hajvágás": 25,
        "balayage": 105
      },
      "dús": {
        "női hajvágás": 60,
        "festés": 90,
        "melír": 105,
        "szárítás": 40,
        "gyermek hajvágás": 30,
        "férfi hajvágás": 30,
        "balayage": 120
      },
      "extra dús": {
        "női hajvágás": 75,
        "festés": 105,
        "melír": 120,
        "szárítás": 45,
        "gyermek hajvágás": 35,
        "férfi hajvágás": 35,
        "balayage": 135
      }
    },
    "közép": {
      "ritka": {
        "női hajvágás": 45,
        "festés": 75,
        "melír": 105,
        "szárítás": 30,
        "gyermek hajvágás": 25,
        "férfi hajvágás": 25,
        "balayage": 120
      },
      "normál": {
        "női hajvágás": 60,
        "festés": 90,
        "melír": 120,
        "szárítás": 40,
        "gyermek hajvágás": 30,
        "férfi hajvágás": 30,
        "balayage": 150
      },
      "dús": {
        "női hajvágás": 75,
        "festés": 120,
        "melír": 150,
        "szárítás": 50,
        "gyermek hajvágás": 35,
        "férfi hajvágás": 35,
        "balayage": 180
      },
      "extra dús": {
        "női hajvágás": 90,
        "festés": 135,
        "melír": 165,
        "szárítás": 60,
        "gyermek hajvágás": 40,
        "férfi hajvágás": 40,
        "balayage": 195
      }
    },
    "hosszú": {
      "ritka": {
        "női hajvágás": 60,
        "festés": 105,
        "melír": 135,
        "szárítás": 45,
        "gyermek hajvágás": 30,
        "férfi hajvágás": 30,
        "balayage": 180
      },
      "normál": {
        "női hajvágás": 75,
        "festés": 120,
        "melír": 165,
        "szárítás": 60,
        "gyermek hajvágás": 35,
        "férfi hajvágás": 35,
        "balayage": 210
      },
      "dús": {
        "női hajvágás": 90,
        "festés": 150,
        "melír": 195,
        "szárítás": 75,
        "gyermek hajvágás": 40,
        "férfi hajvágás": 40,
        "balayage": 240
      },
      "extra dús": {
        "női hajvágás": 105,
        "festés": 180,
        "melír": 225,
        "szárítás": 90,
        "gyermek hajvágás": 45,
        "férfi hajvágás": 45,
        "balayage": 270
      }
    },
    "extra hosszú": {
      "ritka": {
        "női hajvágás": 75,
        "festés": 135,
        "melír": 165,
        "szárítás": 60,
        "gyermek hajvágás": 35,
        "férfi hajvágás": 35,
        "balayage": 210
      },
      "normál": {
        "női hajvágás": 90,
        "festés": 165,
        "melír": 195,
        "szárítás": 75,
        "gyermek hajvágás": 40,
        "férfi hajvágás": 40,
        "balayage": 240
      },
      "dús": {
        "női hajvágás": 105,
        "festés": 195,
        "melír": 225,
        "szárítás": 90,
        "gyermek hajvágás": 45,
        "férfi hajvágás": 45,
        "balayage": 270
      },
      "extra dús": {
        "női hajvágás": 120,
        "festés": 225,
        "melír": 255,
        "szárítás": 105,
        "gyermek hajvágás": 50,
        "férfi hajvágás": 50,
        "balayage": 300
      }
    }
  }
} as const;

export type DurationMatrix = typeof defaultDurationMatrix;
