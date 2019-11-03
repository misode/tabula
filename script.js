const params = new URLSearchParams(window.location.search);

const project = params.get('project');
const repo = params.get('repo');
let sourceLang;
let targetLang;
let langs; // project only
let translations = {}; // repo only

if (project) {
  fetchJson('api').then(data => {
    $('#title').text(data[project]);
  });

  fetchJson('api/' + project).then(data => {
    console.log(data);
    langs = data.langs;
    sourceLang = params.get('source') || data.source;
    targetLang = params.get('target') || sourceLang;
    $.each(langs, (code, name) => {
      $('#targetSelect').append('<option value="' + code + '">' + name + '</option>');
    });
    loadProjectTranslations();
  });
} else if (repo) {
  sourceLang = params.get('source');
  targetLang = params.get('target') || sourceLang;
  loadRepoTranslations();
} else {
  console.err("No project or repository specified.");
}

function loadTranslations() {
  if (project) {
    loadProjectTranslations();
  } else if (repo) {
    loadRepoTranslations();
  }
}

async function loadProjectTranslations() {
  let source = await fetchJson('api/' + project + '/' + sourceLang);
  let [err, target] = await to(fetchJson('api/' + project + '/' + targetLang));
  if (err) {
    target = {};
  }
  updateTranslations(source, target);

  $('#sourceLang').text(langs[sourceLang]);
  $('#targetLang').text(langs[targetLang]);
  $('#targetSelect').val(targetLang);

  $('#tableSpinner').addClass('d-none');
  $('table').removeClass('d-none');
}

async function loadRepoTranslations() {
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
  $('#targetLabel').addClass('d-none');
  $('#targetSelect').addClass('d-none');
  $('#showSelect').addClass('mr-auto');

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
    toInput($translation.find('[data-insert="target"]').parent());
    $translation.find('textarea').val('');
  } else {
    $translation.find('[data-insert="target"]').click(clickEdit);
  }
  $translation.attr('data-key', key);
  return $translation;
}

function toInput(el) {
  let $textarea = $('<textarea type="text" class="form-control w-100 code" style="height: 42px; overflow: hidden"></textarea>').val($(el).text());
  $textarea.keydown(e => onEnter(e))
  $textarea.on('blur', onBlur);
  $(el).parent().html($textarea);
  return $textarea;
}

function toText(el) {
  let $span = $('<span class="clickToEdit" style="cursor: pointer;"></span>');
  $span.click(clickEdit);
  $span.text($(el).find('textarea').val());
  $(el).html($span);
  return $span;
}

function clickEdit(e) {
  let orig = $(e.target).closest('[data-key]');
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
  if (project) {
    fetch('api/' + project + '/' + targetLang + '/' + key + '/' + value);
  } else {
    translations[key] = value;
  }
}

async function exportTarget() {
  if (project) {
    translations = await fetchJson('api/' + project + '/' + targetLang);
  }
  let data = JSON.stringify(translations, Object.keys(translations).sort(), 2);
  var blob = new Blob([data], {
    type: "application/json;charset=utf-8;",
  });
  saveAs(blob, targetLang + '.json');
}

function changeTarget() {
  targetLang = $('#targetSelect').val();
  $('#tableSpinner').removeClass('d-none');
  $('table').addClass('d-none');
  loadProjectTranslations();
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
