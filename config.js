(function () {
      Vue.component('game2048-award', {
        template: '#game2048-award',
        props: {
          award: { type: Object, required: true },
          style: { type: Object },
          likeStyle: { type: Object }
        }
      })
    })();

    (function () {
      var fontSizeCoefs = [1, 1, 0.8, 0.65, 0.5, 0.4, 0.35, 0.32]
      var backColors = []
      backColors[2] = '#87E293'
      backColors[4] = '#87E273'
      backColors[8] = '#eecf40'
      backColors[16] = '#ffaa4f'
      backColors[64] = '#9ebbee'
      backColors[32] = '#6bcae2'
      backColors[128] = 'white'

      var colors = []
      colors[2] = 'white'
      colors[4] = 'white'
      colors[8] = 'white'
      colors[16] = 'white'
      colors[32] = 'white'
      colors[64] = 'white'
      colors[128] = '#2c3e50'

      Vue.component('game2048-chip', {
        template: '#game2048-chip',
        props: {
          chip: { type: Object },
          sizePx: { type: Number },
          animationTimeMs: { type: Number }
        },
        computed: {
          style: function () {
            return {
              fontSize: this.fontSizePx + 'px',
              backgroundColor: this.backColor,
              color: this.color,
              boxShadow: this.boxShadow
            }
          },
          fontSizePx: function () {
            var n = Math.floor(Math.log(this.chip.value) / Math.log(10))
            var b = Math.floor(this.sizePx / 1.5)
            return b * (n < 8 ? fontSizeCoefs[n] : fontSizeCoefs[7])
          },
          backColor: function () {
            return backColors[this.chip.value] || backColors[128]
          },
          color: function () {
            return colors[this.chip.value] || colors[128]
          },
          boxShadow: function () {
            if (this.chip.value < 256) {
              var s = this.sizePx * 0.1 + 'px '
              return '0 ' + s + s + '0 black'
            }
            else {
              return '0 0 20px ' + (2 + Math.min(10, (Math.log(this.chip.value) / Math.log(2) - 7))) + 'px white'
            }
          }
        },
        watch: {
          'chip.value': function () {
            var el = this.$el
            if (el) {
              var d = this.animationTimeMs + 'ms'
              el.style['-webkit-animation'] = el.style.animation = 'chip-value-changed ' + d
              el.style.transition = 'background-color ' + d
              el.style['-webkit-transition'] = '-web-kit-background-color ' + d
            }
          }
        },
        methods: {
          enter: function (el, done) {
            var self = this
            if (this.chip.prevRelPos) {
              var p = this.chip.prevRelPos
              el.style['-webkit-transform'] = el.style.transform = 'translate(' + p.left + 'px,' + p.top + 'px)'
              requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                  el.style.transition = 'transform ' + self.animationTimeMs + 'ms'
                  el.style['-webkit-transition'] = '-webkit-transform ' + self.animationTimeMs + 'ms'
                  el.style['-webkit-transform'] = el.style.transform = '';
                })
              })
            }
            else {
              el.style['-webkit-animation'] = el.style.animation = 'chip-appear ' + this.animationTimeMs + 'ms'
            }
          }
        }
      })
    })();

    (function () {

      function deffered(delayMs, func) {
        var executed = false;
        function execute() {
          if (!executed) {
            func()
            executed = true
          }
        }
        function renew() {
          executed = false
          setTimeout(execute, delayMs)
        }
        renew()
        return {
          finish: execute,
          renew: renew
        }
      }

      function createSwipeListener(onSwipe) {

        var sens = 5
        var st

        function onStart(e) {
          st = e.touches[0]
          e.preventDefault()
        }

        function onEnd(e) {
          var et = e.changedTouches[0]
          var x = st.clientX - et.clientX
          var y = st.clientY - et.clientY
          var mx = Math.abs(x)
          var my = Math.abs(y)
          if (mx < sens && my < sens)
            return

          var d = mx > my
            ? x > 0 ? 'left' : 'right'
            : y > 0 ? 'up' : 'down'
          onSwipe(d)
        }

        return {
          attach: function (el) {
            el.addEventListener('touchstart', onStart, false)
            el.addEventListener('touchend', onEnd, false)
          },
          detach: function (el) {
            el.removeEventListener('touchstart', onStart)
            el.removeEventListener('touchend', onEnd)
          }
        }
      }

      var keyMap = {}
      keyMap[37] = 'left'
      keyMap[38] = 'up'
      keyMap[39] = 'right'
      keyMap[40] = 'down'

      Vue.component('game2048', {
        template: '#game2048',
        props: {
          size: { type: Number },
          sizeAimMap: { type: Array, required: true },
          listenOwnKeyEventsOnly: { type: Boolean, default: false },
          tabIndex: { type: Number, default: 1 },
          boardSizePx: { type: Number, default: 0 },
          animationTimeMs: { type: Number, default: 150 },
          started: { type: Boolean, default: false }
        },
        data: function () {
          var aim = this.sizeAimMap[this.size]
          return {
            cells: this.createCells(),
            boardSizeAutoPx: 0,
            aim: aim
          }
        },
        mounted: function () {
          this.boardSizeAutoPx = this.boardSizePx > 0
            ? this.boardSizePx
            : this.$el.getBoundingClientRect().width
        },
        watch: {
          size: function () {
            this.cells = this.createCells()
            this.aim = this.sizeAimMap[this.size]
            this.$emit('aim-changed', this.aim)
          },
          started: function (nv, ov) {
            if (nv) {
              this.startGame()
            }
            else {
              this.endGame();
            }
          }
        },
        computed: {
          boardStyle: function () {
            return {
              width: this.boardSizePx > 0 ? this.boardSizePx + 'px' : '100%',
              height: this.boardSizePx > 0 ? this.boardSizePx + 'px' : '100%',
              borderRadius: 7 / this.size + '%'
            }
          },
          cellStyle: function () {
            return {
              width: this.cellSizePct + '%',
              height: this.cellSizePct + '%',
              marginLeft: this.cellMarginPct + '%',
              marginTop: this.cellMarginPct + '%',
            }
          },
          cellSizePct: function () {
            return 8 * this.cellMarginPct
          },
          cellMarginPct: function () {
            return 100 / (9 * this.size + 1)
          },
          cellSizePx: function () {
            return this.cellSizePct / 100 *
              (this.boardSizePx > 0 ? this.boardSizePx : this.boardSizeAutoPx)
          }
        },
        methods: {
          startGame: function () {
            this.emptyCells()
            var game = createGame2048(this.size)
            for (var i = Math.max(2, this.size - 2); i > 0; i--) {
              var chips = game.turn()
              this.addChips(chips)
            }
            var doGameMove = this.createGameMove(game)
            this.runKeyboardControl(doGameMove)
            this.runTouchControl(doGameMove)
            this.$emit('started', this)
          },

          runKeyboardControl: function (doGameMove) {
            var listenKeysOn = this.listenOwnKeyEventsOnly ? this.$el : document
            var h = function (e) {
              var m = keyMap[e.keyCode]
              if (m == null)
                return
              e.preventDefault()
              doGameMove(m)
            }
            listenKeysOn.addEventListener('keydown', h)
            this.$once('ended', function () {
              listenKeysOn.removeEventListener('keydown', h)
            })
          },

          runTouchControl: function (doGameMove) {
            var sw = createSwipeListener(function (m) {
              doGameMove(m)
            })
            var el = this.$el
            sw.attach(el)
            this.$once('ended', function () {
              sw.detach(el)
            })
          },

          createGameMove: function (game) {
            var self = this
            var boardChanges = { consolidations: [] }
            var newChips = []
            var consolidateAndAddChipsDeffered = deffered(self.animationTimeMs,
              function () {
                self.consolidateChips(boardChanges.consolidations)
                self.addChips(newChips)
              })

            return function (m) {
              consolidateAndAddChipsDeffered.finish()

              boardChanges = game[m]()
              newChips.length = 0
              if (boardChanges.moves.length > 0) {
                for (var i = Math.max(1, self.size - 3); i > 0; i--) {
                  var chips = game.turn()
                  chips.push.apply(newChips, chips)
                }
                if (boardChanges.scoreInc > 0) {
                  self.$emit('score', { score: game.score(), scoreInc: boardChanges.scoreInc })
                  for (var i = 0; i < boardChanges.consolidations.length; i++) {
                    if (boardChanges.consolidations[i].value == self.aim) {
                      self.$emit('aim-reached')
                      break
                    }
                  }
                }
              }

              self.moveChips(boardChanges.moves)
              consolidateAndAddChipsDeffered.renew()
              if (!game.canMove()) {
                setTimeout(function () {
                  self.endGame()
                }, self.animationTimeMs)
              }
            }
          },

          endGame: function () {
            this.$emit('ended', this)
          },

          consolidateChips: function (consolidations) {
            var self = this
            consolidations.forEach(function (c) {
              var cell = self.getCell(c)
              var chips = cell.chips
              chips.splice(0, chips.length - 1)
              chips[0].value = c.value
            })
          },
          moveChips: function (moves) {
            for (var i = 0; i < moves.length; i++)
              this.moveChip(moves[i].from, moves[i].to)
          },
          moveChip: function (from, to) {
            var fcell = this.getCell(from)
            var fcellEl = this.getCellEl(from)
            var tcell = this.getCell(to)
            var tcellEl = this.getCellEl(to)
            var chip = fcell.chips.splice(0, 1)[0]
            var fboundRect = fcellEl.getBoundingClientRect()
            var tboundRect = tcellEl.getBoundingClientRect()
            chip.prevRelPos = { left: fboundRect.left - tboundRect.left, top: fboundRect.top - tboundRect.top }
            tcell.chips.push(chip)
          },
          addChips: function (chips) {
            chips.forEach(this.addChip)
          },
          addChip: function (c) {
            this.cells[this.getCellIndex(c)].chips.push({ value: c.value })
          },
          getCellIndex: function (c) {
            return c.y * this.size + c.x
          },
          getCell: function (c) {
            return this.cells[this.getCellIndex(c)]
          },
          getCellEl: function (c) {
            return this.$refs.cells[this.getCellIndex(c)]
          },
          createCells: function () {
            return Array.apply(null, { length: this.size * this.size })
              .map(function () { return { chips: [] } })
          },
          emptyCells: function () {
            this.cells.forEach(function (c) { c.chips.splice(0) })
          }
        }
      })
    })()

    var defBoardSizePx = 420
    var defSize = 4
    var app = new Vue({
      el: '#app',
      data: function () {
        var sizeAimMap = []
        sizeAimMap[3] = 256
        sizeAimMap[4] = 2048
        sizeAimMap[5] = 4096
        sizeAimMap[6] = 8192

        var awards = {}
        var bestScore = {}
        var sizes = []
        var i = 0
        for (var s in sizeAimMap) {
          var a = sizeAimMap[s]
          bestScore[s] = 0
          awards[a] = { aim: a, obtained: false }
          sizes[i++] = s
        }

        return {
          boardSizePx: defBoardSizePx,
          size: defSize,
          sizes: sizes,
          sizeAimMap: sizeAimMap,
          gameStarted: false,
          gameEnded: false,
          gameAim: sizeAimMap[defSize],
          gameAimReached: false,
          score: 0,
          scoreInc: '',
          bestScore: bestScore,
          awards: awards
        }
      },
      created: function () {
        this.loadState()
      },
      mounted: function () {
        var self = this
        requestAnimationFrame(function () {
          self.fitBoardSizePx()
          requestAnimationFrame(function () {
            self.$el.style.visibility = 'visible'
            self.showCollectAllAwards()
          })
        })
      },
      computed: {
        gameOverStyle: function () {
          return { fontSize: this.boardSizePx / 6 + 'px' }
        },
        gameContainerStyle: function () {
          return {
            width: this.boardSizePx + 'px',
            height: this.boardSizePx + 'px'
          }
        },
        mainContainerStyle: function () {
          return {
            width: this.boardSizePx + 'px',
          }
        },
        gameControlsStyle: function () {
          return {
            height: (this.boardSizePx * 0.2) + 'px'
          }
        },
        scoreContainerStyle: function () {
          return {
            height: (this.boardSizePx * 0.20) + 'px'
          }
        },
        gameAimStyle: function () {
          var bsh = (this.boardSizePx / 50) + 'px '
          return {
            boxShadow: '0 ' + bsh + bsh + 'black',
            fontSize: this.boardSizePx / 110 + 'em'
          }
        },
        buttonStyle: function () {
          return {
            fontSize: this.boardSizePx / 450 + 'em'
          }
        },
        scoreStyle: function () {
          return {
            fontSize: this.boardSizePx / 280 + 'em'
          }
        },
        gameAwardsContainerStyle: function () {
          return {
            height: (this.boardSizePx * 0.08) + 'px',
          }
        },
        gameAwardStyle: function () {
          return {
            width: this.boardSizePx / 5 + 'px',
            fontSize: this.boardSizePx / 350 + 'em'
          }
        },
        gameAwardLikeStyle: function () {
          return {
            height: this.boardSizePx / 21 + 'px'
          }
        },
        allAwardsObtained: function () {
          for (var i in this.awards)
            if (!this.awards[i].obtained)
              return false
          return true
        }
      },
      watch: {
        size: function () {
          this.gameEnded = false
        }
      },
      methods: {
        fitBoardSizePx: function () {
          if (window.innerWidth < defBoardSizePx * 1.04) {
            this.boardSizePx = window.innerWidth * 0.96
          }
          else {
            this.boardSizePx = defBoardSizePx
          }
        },
        loadState: function () {
          try {
            var s = document.cookie
            if (s) {
              var state = JSON.parse(s)
              if (state) {
                if (state.awards)
                  this.awards = state.awards
                if (state.bestScore)
                  this.bestScore = state.bestScore
              }
            }
          }
          catch (e) {
          }
        },
        persistState: function () {
          try {
            var state = {
              bestScore: this.bestScore,
              awards: this.awards
            }
            document.cookie = JSON.stringify(state)
          }
          catch (e) {
          }
        },
        startGame: function () {
          this.gameStarted = true
          this.score = 0
          this.showCollectAllAwards()
        },
        onGameStarted: function () {
          this.gameStarted = true
          this.gameEnded = false
        },
        onGameEnded: function () {
          this.gameStarted = false
          this.gameEnded = true
          this.gameAimReached = false
          this.persistState()
        },
        onGameScore: function (args) {
          var s = { score: this.score }
          var self = this
          TweenLite.to(s, 0.3, {
            score: args.score, ease: Power0.easeNone, onUpdate: function () {
              self.score = Math.floor(s.score)
            }
          })

          if (args.score > this.bestScore[this.size]) {
            var bs = { score: this.bestScore[this.size] }
            TweenLite.to(bs, 0.3, {
              score: args.score, ease: Power0.easeNone, onUpdate: function () {
                Vue.set(self.bestScore, self.size, Math.floor(bs.score))
              }
            })
          }

          this.scoreInc = args.scoreInc + '+'
          Vue.nextTick(function () { self.scoreInc = '' })
        },
        onGameAimChanged: function (aim) {
          this.gameAim = aim
        },
        onGameAimReached: function () {
          this.gameAimReached = true
          this.awards[this.gameAim].obtained = true
          this.persistState()

          var awardEl = this.getAwardEl(this.gameAim)
          var gameAimEl = this.$refs.gameAim
          var p1 = gameAimEl.getBoundingClientRect()
          var p2 = awardEl.getBoundingClientRect()
          var ws = p1.width / p2.width
          var hs = p1.height / p2.height
          var x = p1.left - p2.left + (p1.width / 4)
          var y = p1.top - p2.top + (p1.height / 2)

          var s = awardEl.style
          s['-webkit-transform'] = s.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + ws + ',' + hs + ')'
          s['-webkit-transition'] = s.transition = ''
          s.zIndex = 100
          requestAnimationFrame(function () {
            s['-webkit-transition'] = s.transition = 'all 2s'
            s['-webkit-transform'] = s.transform = ''
          })
        },
        getAwardEl: function (aim) {
          for (var i in this.$refs.awards) {
            var c = this.$refs.awards[i]
            if (c.award.aim == aim)
              return c.$el
          }
          return null
        },
        showCollectAllAwards: function () {
          var s = this.$refs.collectAllAwards.style
          s['-webkit-animation'] = s.animation = ''
          requestAnimationFrame(function () {
            s['-webkit-animation'] = s.animation = 'collect-all-awards 10s'
          })
        }
      }
    })
