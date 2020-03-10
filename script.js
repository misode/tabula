const params = new URLSearchParams(window.location.search);

const editIcon = 'https://cdnjs.cloudflare.com/ajax/libs/octicons/8.5.0/svg/pencil.svg';

const repo = params.get('repo');
let sourceLang;
let targetLang;
let translations = {};

$('#importButton').on('click', () => {
  $('#targetInput').trigger('click');
});

if (repo) {
  sourceLang = params.get('source');
  targetLang = params.get('target') || sourceLang;
  $('#title').text(repo);
  loadTranslations();
} else {
  console.error("No repository specified.");
}

async function loadTranslations() {
  const url = 'https://raw.githubusercontent.com/' + params.get('repo') + '/';

  let source = await fetchJson(url + '/' + sourceLang + '.json');
  let [err, target] = await to(fetchJson(url + '/' + targetLang + '.json'));
  if (err) {
    target = {};
  }
  translations = target;
  updateTranslations(source, target);

  $('#sourceLang').text(sourceLang);
  $('#targetLang').text(targetLang);

  $('#tableSpinner').addClass('d-none');
  $('table').removeClass('d-none');
}

function updateTranslations(source, target) {
  $('#translationList').html('');
  let keys = Object.keys(source).sort();
  for (let key of keys) {
    if (key === '%1$s%3427655$s') continue;
    $('#translationList').append(getTranslation(key, source[key], target[key]));
  }
}

function getTranslation(key, source, target) {
  let filter = $('#showSelect').val();
  if (filter === 'translated' && !target) return;
  if (filter === 'untranslated' && target) return;
  let $translation = $('#translationTemplate').find('tr').clone();
  $translation.find('[data-insert="key"]').text(key);
  $translation.find('[data-insert="source"]').text(source);
  $translation.find('[data-insert="target"]').text(target);
  if (target === undefined) {
    toInput($translation.find('[data-insert="target"]'));
    $translation.find('textarea').val('');
  } else {
    $translation.find('[data-insert="target"]').append('<img src="' + editIcon + '" alt="" class="ml-1 mb-1">');
    $translation.find('[data-insert="target"]').click(clickEdit);
  }
  $translation.attr('data-key', key);
  return $translation;
}

function toInput(el) {
  let translation = $(el).closest('span').text();
  let $textarea = $('<textarea type="text" class="form-control w-100 code" style="height: 42px; overflow: hidden"></textarea>').val(translation);
  $textarea.keydown(e => onEnter(e))
  $textarea.on('blur', onBlur);
  $(el).closest('span').parent().html($textarea);
  return $textarea;
}

function toText(el) {
  let $span = $('<span class="clickToEdit" style="cursor: pointer;"></span>');
  $span.click(clickEdit);
  $span.text($(el).find('textarea').val());
  $span.append('<img src="' + editIcon + '" alt="" class="ml-1 mb-1">');
  $(el).html($span);
  return $span;
}

function clickEdit(e) {
  toInput(e.target).focus();
  e.stopPropagation();
}

function onEnter(e) {
  if (e.which === 13) {
    onBlur(e);
    e.preventDefault();
  }
}

function onBlur(e) {
  let key = $(e.target).closest('[data-key]').attr('data-key');
  let value = $(e.target).val();
  if (value.length > 0) {
    toText($(e.target).parent());
  }
  translations[key] = value;
  saveLocalStorage();
}

function fileInput(files) {
  if (!files[0].name.match(/\.json$/)) return;

  const reader = new FileReader();
  reader.onload = () => importTarget(reader);
  reader.readAsText(files[0]);
}

async function importTarget(reader) {
  const url = 'https://raw.githubusercontent.com/' + params.get('repo') + '/';

  let source = await fetchJson(url + '/' + sourceLang + '.json');
  translations = JSON.parse(reader.result);
  updateTranslations(source, translations);
}

async function exportTarget() {
  let data = JSON.stringify(translations, Object.keys(translations).sort(), 2);
  var blob = new Blob([data], {
    type: "application/json;charset=utf-8;",
  });
  saveAs(blob, targetLang + '.json');
}

async function loadLocalStorage() {
  if (!project){
    const value = localStorage.getItem(`${repo}|${targetLang}`);
    if (value) {
      const url = 'https://raw.githubusercontent.com/' + params.get('repo') + '/';
      const source = await fetchJson(url + '/' + sourceLang + '.json');
      const target = JSON.parse(value);
      translations = target;
      updateTranslations(source, target);
    } else {
      alert('No local storage found!');
    }
  }
}

async function saveLocalStorage() {
  localStorage.setItem(`${repo}|${targetLang}`, JSON.stringify(translations));
}

async function fetchJson(url) {
  let response = await fetch(url);
  return await response.json();
}

function to(promise) {
  return promise.then(data => {
    return [null, data];
  })
  .catch(err => [err]);
}
