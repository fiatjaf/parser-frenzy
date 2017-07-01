const h = require('karet-hyperscript')
const cuid = require('cuid')
const L = require('partial.lenses')
const R = require('ramda')

const log = require('../log')
const dateFormat = require('../helpers/date').asLongAsNeeded

const state = require('../state')
const facts = state.view('facts')

module.exports = function Input () {
  const addFact = (e) => {
    e.preventDefault()
    let db = state.view('db').get()
    let line = facts.view('adding').get()
    db.put({
      _id: `f:${cuid.slug()}`,
      line
    })
      .then(R.call(log.success, 'Fact added.'))
      .catch(log.error)
  }

  const removeFact = R.partial((fact) => {
    log.confirm(`Delete "${fact.line}" forever?`, () => {
      let db = state.view('db').get()
      db.remove(fact)
        .then(R.call(log.info, 'Fact removed.'))
        .catch(log.error)
    })
  })

  const updateFact = R.partial((fact, values) => {
    let db = state.view('db').get()
    db.put({...fact, ...values})
      .then(R.call(log.success, 'Fact updated.'))
      .then(R.call(facts.modify, L.set('editing', null)))
      .catch(log.error)
  })

  return (
    h('#Input', [
      h('.preview', null), // state.input.adding.preview),
      h('form.add', {onSubmit: addFact}, [
        h('.field.has-addons', [
          h('.control.is-expanded', [
            h('input.input', {
              onChange (e) { facts.modify(L.set('adding', e.target.value)) },
              value: state.view(['adding'])
            })
          ]),
          h('.control', [
            h('button.button.is-primary', {type: 'submit'}, 'Add')
          ])
        ])
      ]),
      h('div', facts.view(['list', L.defaults([])]).map(facts => facts
        .map(fact =>
          h(Fact, {
            key: fact._id,
            fact,
            remove: removeFact([fact]),
            update: updateFact([fact])
          })
        )
      ))
    ])
  )
}

function Fact ({fact, remove, update}) {
  let {_id, line} = fact
  const temp = facts.view(['tempValues', _id, L.defaults(fact)])

  var tags = []
  var runInfo = []

  // if (rules.length) {
  //   var count = {affected: 0, errors: 0}
  //   for (let i = 0; i < rules.length; i++) {
  //     let {ruleId, pattern, data, affected, error} = rules[i]
  //     count.affected += affected.length
  //     count.errors += error ? 1 : 0

  //     runInfo.push(
  //       h('div', [
  //         h('p', [
  //           h('span.tag.is-info', 'matched'), ' ',
  //           h('a', {href: `/rules/rules?rule=${ruleId}`}, [ h('code', pattern) ]), ' yielding ',
  //           h('span.tag.is-dark', Object.keys(data).map(k => `${k}:${data[k]}`).join(' '))
  //         ]),
  //         h('dl', affected.map(({kind, at, val}) =>
  //           h('dd', [
  //             h('span.tag.is-info', kind), ' at ',
  //             h('a', {href: `/browse/raw?at=${at.join('.')}`}, at.join('.')),
  //             ' with value ', h('code', JSON.stringify(val)), '.'
  //           ])
  //         ).concat(
  //           error && h('dd', [
  //             'error ', h('code', error.message)
  //           ])
  //         ))
  //       ])
  //     )
  //   }

  //   tags.push(
  //     h('a.tag.is-info', {
  //       'data-balloon': `matched ${rules.length} rule${rules.length === 1 ? '' : 's'}`
  //     }, rules.length)
  //   )
  //   tags.push(
  //     h('a.tag.is-success', {
  //       'data-balloon': `affected data in ${count.affected} place${count.affected === 1 ? '' : 's'}.`
  //     }, count.affected)
  //   )
  //   count.errors.length && tags.push(
  //     h('a.tag.is-danger', {
  //       'data-balloon': `raised an error in ${count.errors} place${count.errors === 1 ? '' : 's'}.`
  //     }, count.errors)
  //   )
  // }

  return (
    h('.card.fact', [
      h('.card-content', [
        h('.columns.is-mobile', [
          facts.view('opened').map(opened => opened === _id
            ? null
            : h('.column.is-narrow', {
              onClick (e) { facts.modify(L.set('opened', _id)) }
            }, tags)
          ),
          h('.column', [
            facts.view('editing').map(editing => editing === _id
              ? h('.control', [
                h('input.input', {
                  onChange (e) { temp.modify(L.set('line', e.target.value)) },
                  value: temp.view('line')
                })
              ])
              : line
            )
          ]),
          h('.column.is-narrow.date', [
            h('a', {
              onClick (e) {
                facts.modify(L.modify('opened', opened => opened === _id ? null : _id))
              }
            }, dateFormat(_id))
          ])
        ]),
        h('div', facts.view('opened').map(opened => opened === _id ? runInfo : null))
      ]),
      facts.view(L.pick({opened: 'opened', editing: 'editing'}))
        .map(({opened, editing}) => opened === _id
        ? h('.card-footer', [
          h('.card-footer-item', [
            h('a', { onClick: remove }, 'Delete')
          ]),
          editing === _id
            ? h('.card-footer-item', [
              temp.map(t =>
                h('a', {
                  onClick (e) { update(t) }
                }, 'Save')
              )
            ])
            : h('.card-footer-item', [
              h('a', {
                onClick (e) { facts.modify(L.set('editing', _id)) }
              }, 'Edit')
            ])
        ])
        : null
      )
    ])
  )
}
