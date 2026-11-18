'use strict';

const days = [
  ['ПН', 'Понедельник'], ['ВТ', 'Вторник'], ['СР', 'Среда'],
  ['ЧТ', 'Четверг'], ['ПТ', 'Пятница'], ['СБ', 'Суббота'], ['ВС', 'Воскресенье']
];
const coaches = {
  kasyanov: {
    name: 'Михаил Касьянов',
    phone: '+79653515531',
    phoneLabel: '+7 (965) 351-55-31',
    callLabel: 'Позвонить Михаилу',
    groups: [
      { days: [0, 1, 3, 4], slots: [['17:00', '7–12 лет'], ['17:45', '10–14 лет'], ['18:30', '14–18 лет']] },
      { days: [2], slots: [['16:15', '7–12 лет'], ['17:00', '10–14 лет'], ['17:45', '12–18 лет']] },
      { days: [0, 4], slots: [['19:15', 'Взрослые · 18+']] },
      { days: [3], slots: [['19:15', 'Взрослые · 18+ · уточните у тренера']] },
      { days: [5], slots: [['10:15', '7–12 лет'], ['11:00', '12–18 лет'], ['12:30–13:30', 'Семейное плавание · взрослый и ребёнок 7–9 лет']] }
    ]
  },
  kornilov: {
    name: 'Алексей Корнилов',
    phone: '+79030430011',
    phoneLabel: '+7 (903) 043-00-11',
    callLabel: 'Позвонить Алексею',
    groups: [
      { days: [0, 2], slots: [['15:30', '7–9 лет']] },
      { days: [0, 4], slots: [['16:15', '7–9 лет'], ['17:00', '10–12 лет']] },
      { days: [0, 2, 4], slots: [['17:45', 'От 10 лет'], ['18:30', 'От 10 лет']] },
      { days: [0], slots: [['19:15', 'Возраст уточните у тренера']] },
      { days: [2], slots: [['19:15', 'От 10 лет']] },
      { days: [4], slots: [['19:15', 'От 13 лет']] },
      { days: [5, 6], slots: [['10:15', 'От 13 лет'], ['11:00', '7–10 лет'], ['11:45', '10–13 лет']] }
    ]
  }
};

const byId = id => document.getElementById(id);
const programSelect = byId('program-select');
const coachTabs = [...document.querySelectorAll('[data-coach-tab]')];
const schedules = new Map();
const bookingTabs = [...document.querySelectorAll('[data-booking-tab]')];
let bookingCoach = 'kasyanov';
let bookingDay;
let bookingTime;

function tabTarget(event, current, count) {
  if (event.ctrlKey || event.metaKey || event.altKey) return undefined;
  return {
    ArrowRight: (current + 1) % count,
    ArrowLeft: (current + count - 1) % count,
    Home: 0,
    End: count - 1
  }[event.key];
}

function selectTab(tab, active) {
  tab.tabIndex = active ? 0 : -1;
  tab.setAttribute('aria-selected', String(active));
}

function chooseCoach(key, focus = false) {
  for (const tab of coachTabs) {
    const active = tab.dataset.coachTab === key;
    const schedule = schedules.get(tab.dataset.coachTab);
    selectTab(tab, active);
    schedule.panel.hidden = !active;
    schedule.content.classList.toggle('pool-schedule', active);
    if (active && focus) tab.focus();
  }
  document.dispatchEvent(new CustomEvent('flashswim:daychange'));
}

function slotsFor(key, index) {
  return coaches[key].groups
    .filter(group => group.days.includes(index))
    .flatMap(group => group.slots)
    .sort(([first], [second]) => first.localeCompare(second));
}

function chooseDay(key, index, fromUser = false) {
  const schedule = schedules.get(key);
  schedule.day = index;
  schedule.selectedDay = fromUser;
  schedule.selectedTime = undefined;
  schedule.tabs.forEach((tab, tabIndex) => selectTab(tab, tabIndex === index));
  schedule.details.setAttribute('aria-labelledby', schedule.tabs[index].id);
  schedule.details.querySelector('h4').textContent = days[index][1];
  const slots = slotsFor(key, index);
  const description = schedule.details.querySelector('.day-description');
  description.textContent = slots.length
    ? 'Выберите время, чтобы указать его при записи.'
    : 'В этот день групповых занятий в расписании нет.';
  schedule.slotGrid.replaceChildren();
  schedule.slotGrid.hidden = !slots.length;
  for (const [time, age] of slots) {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'time-choice coach-time-choice';
    slot.dataset.time = time;
    slot.setAttribute('aria-pressed', 'false');
    const hour = document.createElement('strong');
    hour.textContent = time;
    const ageGroup = document.createElement('small');
    ageGroup.textContent = age;
    slot.append(hour, ageGroup);
    schedule.slotGrid.append(slot);
  }
  document.dispatchEvent(new CustomEvent('flashswim:daychange'));
}

function renderWeek(panel, key) {
  const week = panel.querySelector('[data-week]');
  const list = week.querySelector('[data-week-list]');
  for (const [index, [, day]] of days.entries()) {
    const slots = slotsFor(key, index);
    const block = document.createElement('div');
    const heading = document.createElement('strong');
    heading.textContent = day;
    const times = document.createElement('ul');
    for (const [time, age] of (slots.length ? slots : [['', 'Групповых занятий нет']])) {
      const item = document.createElement('li');
      if (time) {
        const hour = document.createElement('b');
        hour.textContent = time;
        item.append(hour, ' ');
      }
      item.append(age);
      times.append(item);
    }
    block.append(heading, times);
    list.append(block);
  }
  week.hidden = false;
}

for (const [index, tab] of coachTabs.entries()) {
  const key = tab.dataset.coachTab;
  const panel = byId(tab.getAttribute('aria-controls'));
  const content = panel.querySelector('[data-coach-content]');
  const weekdayPicker = content.querySelector('[data-day-tabs]');
  const details = content.querySelector('[data-day-details]');
  const slotGrid = content.querySelector('[data-slot-grid]');
  const tabs = days.map(([short, label], dayIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'schedule-day';
    button.id = 'schedule-day-' + key + '-' + dayIndex;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-controls', details.id);
    button.textContent = short;
    button.addEventListener('click', () => chooseDay(key, dayIndex, true));
    button.addEventListener('keydown', event => {
      const target = tabTarget(event, dayIndex, days.length);
      if (target === undefined) return;
      event.preventDefault();
      chooseDay(key, target, true);
      tabs[target].focus();
    });
    return button;
  });
  schedules.set(key, {panel, content, details, slotGrid, tabs});
  weekdayPicker.replaceChildren(...tabs);
  weekdayPicker.hidden = false;
  chooseDay(key, 0);
  renderWeek(panel, key);
  slotGrid.addEventListener('click', event => {
    const button = event.target.closest('[data-time]');
    if (!button) return;
    const schedule = schedules.get(key);
    schedule.selectedDay = true;
    schedule.selectedTime = schedule.selectedTime === button.dataset.time ? undefined : button.dataset.time;
    for (const option of slotGrid.children) {
      option.setAttribute('aria-pressed', String(option.dataset.time === schedule.selectedTime));
    }
  });
  tab.addEventListener('click', () => chooseCoach(key));
  tab.addEventListener('keydown', event => {
    const target = tabTarget(event, index, coachTabs.length);
    if (target === undefined) return;
    event.preventDefault();
    chooseCoach(coachTabs[target].dataset.coachTab, true);
  });
}

if (coachTabs.length) {
  byId('coach-schedule-tabs').hidden = false;
  chooseCoach(coachTabs[0].dataset.coachTab);
}

function resetBookingFeedback() {
  byId('booking-status').textContent = '';
  byId('booking-text').hidden = true;
}

function updateBooking() {
  const choice = [bookingDay, bookingTime].filter(Boolean).join(', ');
  const coach = coaches[bookingCoach];
  const context = [coach.name, choice && 'Желаемое время: ' + choice].filter(Boolean);
  byId('selected-pool').textContent = [...context, 'СК «Восход»'].join(' · ');
  byId('edit-booking').hidden = !choice;
  for (const tab of bookingTabs) {
    const selected = tab.dataset.bookingTab === bookingCoach;
    selectTab(tab, selected);
    if (selected) byId('booking-coach-panel').setAttribute('aria-labelledby', tab.id);
  }
  byId('booking-phone').href = 'tel:' + coach.phone;
  byId('booking-call-label').textContent = coach.callLabel;
  byId('booking-number').textContent = coach.phoneLabel;
  return 'Здравствуйте! Хочу записаться на занятия плаванием в СК «Восход». '
    + 'Интересует: ' + programSelect.value + '. '
    + 'Тренер: ' + coach.name + '. '
    + (choice ? 'Удобное время: ' + choice + '. ' : '')
    + 'Подскажите, пожалуйста, расписание и свободные места.';
}

document.addEventListener('click', event => {
  const scheduleLink = event.target.closest('[data-show-schedule]');
  if (scheduleLink) chooseCoach(scheduleLink.dataset.showSchedule);

  const link = event.target.closest('[data-program], [data-book-coach]');
  if (!link) return;
  if (link.dataset.program) {
    const program = [...programSelect.options].find(option => option.value === link.dataset.program);
    if (program) programSelect.value = program.value;
  }
  if (link.dataset.bookCoach) bookingCoach = link.dataset.bookCoach;
  bookingDay = undefined;
  bookingTime = undefined;
  if (link.hasAttribute('data-schedule-selection')) {
    const schedule = schedules.get(bookingCoach);
    if (schedule?.selectedDay) {
      bookingDay = days[schedule.day][1];
      bookingTime = schedule.selectedTime;
    }
  }
  updateBooking();
  resetBookingFeedback();
});

function chooseBookingCoach(tab) {
  const key = tab.dataset.bookingTab;
  if (key !== bookingCoach) {
    bookingCoach = key;
    bookingDay = undefined;
    bookingTime = undefined;
  }
  updateBooking();
  resetBookingFeedback();
}

bookingTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => chooseBookingCoach(tab));
  tab.addEventListener('keydown', event => {
    const target = tabTarget(event, index, bookingTabs.length);
    if (target === undefined) return;
    event.preventDefault();
    chooseBookingCoach(bookingTabs[target]);
    bookingTabs[target].focus();
  });
});
byId('booking-coach-tabs').hidden = false;

programSelect.addEventListener('change', () => {
  updateBooking();
  resetBookingFeedback();
});

byId('edit-booking').addEventListener('click', () => {
  bookingDay = undefined;
  bookingTime = undefined;
  updateBooking();
  resetBookingFeedback();
  programSelect.focus();
});

byId('copy-booking').addEventListener('click', async () => {
  const message = updateBooking();
  const status = byId('booking-status');
  const preview = byId('booking-text');
  try {
    await navigator.clipboard.writeText(message);
    preview.hidden = true;
    status.textContent = 'Сообщение скопировано. Отправьте его тренеру или администратору.';
  } catch {
    preview.value = message;
    preview.hidden = false;
    preview.focus();
    preview.select();
    status.textContent = 'Скопируйте текст запроса из поля ниже.';
  }
});

const menuButton = document.querySelector('.menu-toggle');
const mobileNav = byId('mobile-nav');
function setMenu(open) {
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  mobileNav.hidden = !open;
}

menuButton.addEventListener('click', () => setMenu(mobileNav.hidden));
mobileNav.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) {
    setMenu(false);
    menuButton.focus();
  }
});
window.matchMedia('(min-width: 781px)').addEventListener('change', event => {
  if (event.matches) setMenu(false);
});

byId('copy-booking').hidden = false;
byId('year').textContent = new Date().getFullYear();
updateBooking();
