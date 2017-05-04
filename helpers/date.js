const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

const today = new Date()

module.exports.asLongAsNeeded = function (_id) {
  let date = new Date(parseInt(_id.split(':')[1]))

  if (today.getFullYear() === date.getFullYear()) {
    if (today.getMonth() === date.getMonth()) {
      if (today.getDate() === date.getDate()) {
        // today
        return `today, ${date.getHours()}:${date.getMinutes()}`
      } else {
        // a different day in the same month
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getHours()}:${date.getMinutes()}`
      }
    } else {
      // a different month in the same year
      return `${months[date.getMonth()]} ${date.getDate()}`
    }
  } else {
    // a different year
    return `${months[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`
  }
}


