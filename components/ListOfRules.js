const h = require('karet-hyperscript')
const cuid = require('cuid')
const R = require('ramda')
const L = require('partial.lenses')
const Kefir = require('kefir')

const CodeMirror = require('react-codemirror')
require('codemirror/mode/javascript/javascript')

const log = require('../log')

const state = require('../state')
const rules = state.view('rules')

module.exports = function ListOfRules (props) {
  var list = rules.view('list')

  if (props.query.rule) {
    list = list.view(L.find(R.whereEq({_id: props.query.rule})))
  }

  const createRule = (e) => {
    let cid = cuid.slug()
    let db = state.view('db').get()
    let newpattern = rules.view('newpattern').get()
    let newcode = rules.view('newcode').get()
    db.put({
      _id: `rule:${cid}`,
      pattern: newpattern,
      code: newcode
    })
      .then(R.call(log.success, 'Rule ${cid} created.'))
      .catch(log.error)
  }

  const removeRule = R.partial((rule) => {
    log.confirm(`Delete "${rule.pattern}" forever?`, () => {
      let db = state.view('db').get()
      db.remove(rule)
        .then(R.call(log.info, 'Rule removed.'))
        .catch(log.error)
    })
  })

  const updateRule = R.partial((rule, values) => {
    let db = state.view('db').get()
    db.put({...rule, ...values})
      .then(R.call(log.success, 'Rule updated.'))
      .then(R.call(rules.modify, L.set('editing', null)))
      .catch(log.error)
  })

  return (
    h('#ListOfRules', [
      props.query.rule
        ? null
        : h('.create.card', [
          h('.card-header', [
            h('span.card-header-title', 'Create new rule')
          ]),
          h('.card-content', [
            h('form', {
              onSubmit: createRule
            }, [
              h('p.control', [
                h('input.input', {
                  value: rules.view('newpattern'),
                  onChange (e) { rules.view('newpattern').set(e.target.value) },
                  placeholder: '<someone:word> [has] paid <value:money> on <date>'
                })
              ]),
              h('div.control', [
                rules.view('newcode').map(newcode =>
                  h(CodeMirror, {
                    value: newcode,
                    onChange (newcode) { rules.view('newcode').set(newcode) },
                    options: {
                      viewportMargin: Infinity,
                      mode: 'text/javascript'
                    }
                  })
                )
              ]),
              h('div.control', [
                h('button.button', 'Create')
              ])
            ])
          ])
        ]),
      h('div', list.map(list => list
        .map(rule =>
          h(Rule, {
            key: rule._id,
            rule,
            remove: removeRule([rule]),
            update: updateRule([rule])
          })
        )
      ))
    ])
  )
}

function Rule ({rule, update, remove}) {
  let {_id} = rule
  const tempLens = ['tempValues', _id, L.defaults(rule)]
  const temp = rules.view(tempLens)

  var parseErrors = []
  var facts = []
  var errors = []

  return (
    h('.card.rule', {
      className: Kefir.combine([
        rules.view('opened'),
        rules.view('editing')
      ])
        .map(([o, e]) => [o ? 'open' : 'closed', e ? 'editing' : 'not-editing'].join(' '))
    }, [
      h('.card-header', [
        h('span.card-header-title', [
          `rule ${_id.split(':')[1]} `,
          rules.view('opened').map(o => !o &&
            parseErrors &&
              h('a.tag.is-warning', {
                'data-balloon': "couldn't parse this rule.",
                onClick (e) {
                  rules.modify(L.set(L.pick({o: 'opened', e: 'editing'}), {o: _id, e: null}))
                }
              }, 'invalid') || null
          ),
          rules.view('opened').map(o => !o &&
            facts.length > 0 &&
              h('a.tag.is-info', {
                'data-balloon': `${facts.length} facts matched.`,
                onClick (e) {
                  rules.modify(L.set(L.pick({o: 'opened', e: 'editing'}), {o: _id, e: null}))
                }
              }, facts.length) || null
          ),
          rules.view('opened').map(o => !o &&
            errors.length > 0 &&
              h('a.tag.is-danger', {
                'data-balloon': `${errors.length} errored.`,
                onClick (e) {
                  rules.modify(L.set(L.pick({o: 'opened', e: 'editing'}), {o: _id, e: null}))
                }
              }, errors.length) || null
          )
        ]),
        h('a.card-header-icon', {
          onClick (e) {
            rules.modify(L.modify(
              L.pick({o: 'opened', e: 'editing'}),
              ({o, e}) => o === _id ? {o: null, e: null} : {o: _id, e: null})
            )
          }
        }, [
          h('span.icon', [
            rules.view('opened').map(o => o
              ? h('i.fa.fa-angle-down')
              : h('i.fa.fa-angle-up')
            )
          ])
        ])
      ]),
      h('.card-content', [
        h('p.control', [
          h('input.input', {
            onChange (e) { temp.modify(L.set('pattern', e.target.value)) },
            value: temp.view('pattern'),
            disabled: rules.view('editing').map(e => e !== _id)
          })
        ]),
        h('div.control', [
          rules.view(L.pick({code: [tempLens, 'code'], e: 'editing'})).map(({code, e}) => {
            return h(CodeMirror, {
              value: code,
              onChange (v) {
                temp.modify(L.set('code', v))
              },
              options: {
                viewportMargin: e === _id ? Infinity : 7,
                mode: 'text/javascript',
                readOnly: e === _id ? false : 'nocursor'
              }
            })
          })
        ]),
        rules.view('opened').map(o => o
          ? h('div', [
            h('div', parseErrors.map(({message}) =>
              h('p', [
                h('span.tag.is-warning', 'pattern invalid'), ' ',
                h('code', message)
              ])
            )),
            h('div', facts.map(({line, data}) =>
              h('p', [
                h('span.tag.is-info', 'matched'), ' ',
                h('code', line), ' yielding ',
                h('span.tag.is-dark',
                  Object.keys(data).map(k => `${k}:${data[k]}`).join(' ')
                )
              ])
            )),
            h('div', errors.map(({error, line}) =>
              h('p', [
                h('span.tag.is-danger', 'error'), ' ',
                h('code', error), ' at ', h('code', line)
              ])
            ))
          ])
          : null
        )
      ]),
      rules.view('opened').map(o => o && h('.card-footer', [
        h('.card-footer-item', [
          h('a', { onClick: remove }, 'Delete')
        ]),
        h('.card-footer-item', [
          Kefir.combine([
            rules.view('editing'),
            temp
          ]).map(([e, t]) => e
            ? h('a', { onClick (e) { update(t) }}, 'Save')
            : h('a', {
              onClick (e) {
                rules.modify(L.set(L.pick({o: 'opened', e: 'editing'}), {o: _id, e: _id}))
              }
            }, 'Edit')
          )
        ])
      ]) || null)
    ])
  )
}
