if exists("b:current_syntax")
  finish
endif

syn keyword roomDirective ROOM TITLE DESC EXIT ITEM NEED CONSUME LOOK USE ONUSE NEEDFLAG HIDDEN START WINROOM WIN TREASURE
syn keyword roomDirection NORTH SOUTH EAST WEST UP DOWN

syn match roomComment /^\s*#.*/
syn match roomKey /^\s*\u\w*\ze\s*:/
syn match roomRoomId /^\s*ROOM:\s*\zs\S\+/
syn match roomExitDir /^\s*EXIT:\s*\zs\u\+/
syn match roomNeedDir /^\s*NEED:\s*\zs\u\+/
syn match roomConsumeDir /^\s*CONSUME:\s*\zs\u\+/
syn match roomNeedFlagDir /^\s*NEEDFLAG:\s*\zs\u\+/
syn match roomString /"[^\"]*"/

" LOOK keys on LOOK lines (supports: key | desc, "multi word" desc, or single token desc)
syn match roomLookKey /^\s*LOOK:\s*\zs.\{-}\ze\s*|/
syn match roomLookKey /^\s*LOOK:\s*\zs"[^"]\+"\ze\s\+/
syn match roomLookKey /^\s*LOOK:\s*\zs\S\+\ze\s\+/

" DESC line content region for dynamic LOOK-key containment.
" Uses lookbehind so the DESC: prefix stays free for roomKey highlighting.
syn match roomDescText /\%(^\s*DESC:\s*\)\@<=.*/ contains=roomLookInDesc,roomDirection,roomString

function! s:ExtractLookKey(line) abort
  let l = substitute(a:line, '^\s*LOOK:\s*', '', '')

  let m = matchlist(l, '^\(.\{-}\)\s*|\s\+.*$')
  if len(m) > 1
    return tolower(trim(m[1]))
  endif

  let m = matchlist(l, '^"\([^"]\+\)"\s\+.*$')
  if len(m) > 1
    return tolower(trim(m[1]))
  endif

  let m = matchlist(l, '^\(\S\+\)\s\+.*$')
  if len(m) > 1
    return tolower(trim(m[1]))
  endif

  return ''
endfunction

function! s:DefineLookHighlights() abort
  silent! syntax clear roomLookInDesc

  let seen = {}
  for lnum in range(1, line('$'))
    let lineText = getline(lnum)
    if lineText !~? '^\s*LOOK:\s*'
      continue
    endif

    let key = s:ExtractLookKey(lineText)
    if empty(key) || has_key(seen, key)
      continue
    endif
    let seen[key] = 1

    let lit = escape(key, '\/')
    execute 'syntax match roomLookInDesc /\c\V' . lit . '/ contained containedin=roomDescText'
  endfor
endfunction

call s:DefineLookHighlights()

augroup room_syntax_dynamic
  autocmd! * <buffer>
  autocmd BufEnter,BufWritePost,TextChanged,TextChangedI <buffer> call <SID>DefineLookHighlights()
augroup END

hi def link roomDirective Keyword
hi def link roomDirection Identifier
hi def link roomComment Comment
hi def link roomKey Statement
hi def link roomRoomId Type
hi def link roomExitDir Special
hi def link roomNeedDir Special
hi def link roomConsumeDir Special
hi def link roomNeedFlagDir Special
hi def link roomString String

" Stronger, explicit color so LOOK terms are visibly highlighted.
hi def roomLookKey guifg=#ffb86c ctermfg=215 gui=bold cterm=bold
hi def roomLookInDesc guifg=#ffb86c ctermfg=215 gui=bold cterm=bold

let b:current_syntax = "room"