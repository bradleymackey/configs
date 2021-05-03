-- Abstract:
-- Setup of the native Neovim LSP
-- Called from `init.vim`

-- Status
local lsp_status = require('lsp-status')
lsp_status.register_progress()
lsp_status.config({
  status_symbol = '',
  indicator_hint = ' @ =',
  indicator_errors = ' ! =',
  indicator_warnings = ' * =',
  indicator_info = ' ~ =',
  current_function = false,
})

-- Formatting

-- (format on save helper)
vim.lsp.handlers["textDocument/formatting"] = function(err, _, result, _, bufnr)
    if err ~= nil or result == nil then
        return
    end
    if not vim.api.nvim_buf_get_option(bufnr, "modified") then
        local view = vim.fn.winsaveview()
        vim.lsp.util.apply_text_edits(result, bufnr)
        vim.fn.winrestview(view)
        if bufnr == vim.api.nvim_get_current_buf() then
            vim.api.nvim_command("noautocmd :update")
        end
    end
end

-- LSP setup

local nvim_lsp = require('lspconfig')
local on_attach = function(client, bufnr)
  local function buf_set_keymap(...) vim.api.nvim_buf_set_keymap(bufnr, ...) end
  local function buf_set_option(...) vim.api.nvim_buf_set_option(bufnr, ...) end

  buf_set_option('omnifunc', 'v:lua.vim.lsp.omnifunc')

  -- Completion
  require('completion').on_attach()

  -- Status
  lsp_status.on_attach(client)

  -- Mappings
  local opts = { noremap=true, silent=true }
  buf_set_keymap('n', 'gD', '<Cmd>lua vim.lsp.buf.declaration()<CR>', opts)
  buf_set_keymap('n', 'gd', '<Cmd>lua vim.lsp.buf.definition()<CR>', opts)
  buf_set_keymap('n', 'K', '<Cmd>lua vim.lsp.buf.hover()<CR>', opts)
  buf_set_keymap('n', 'gi', '<cmd>lua vim.lsp.buf.implementation()<CR>', opts)
  buf_set_keymap('n', '<C-k>', '<cmd>lua vim.lsp.buf.signature_help()<CR>', opts)
  buf_set_keymap('n', '<space>wa', '<cmd>lua vim.lsp.buf.add_workspace_folder()<CR>', opts)
  buf_set_keymap('n', '<space>wr', '<cmd>lua vim.lsp.buf.remove_workspace_folder()<CR>', opts)
  buf_set_keymap('n', '<space>wl', '<cmd>lua print(vim.inspect(vim.lsp.buf.list_workspace_folders()))<CR>', opts)
  buf_set_keymap('n', '<space>D', '<cmd>lua vim.lsp.buf.type_definition()<CR>', opts)
  buf_set_keymap('n', '<space>rn', '<cmd>lua vim.lsp.buf.rename()<CR>', opts)
  buf_set_keymap('n', '<space>ca', '<cmd>lua vim.lsp.buf.code_action()<CR>', opts)
  buf_set_keymap('n', 'gr', '<cmd>lua vim.lsp.buf.references()<CR>', opts)
  buf_set_keymap('n', '<space>e', '<cmd>lua vim.lsp.diagnostic.show_line_diagnostics()<CR>', opts)
  buf_set_keymap('n', '[d', '<cmd>lua vim.lsp.diagnostic.goto_prev()<CR>', opts)
  buf_set_keymap('n', ']d', '<cmd>lua vim.lsp.diagnostic.goto_next()<CR>', opts)
  buf_set_keymap('n', '<space>q', '<cmd>lua vim.lsp.diagnostic.set_loclist()<CR>', opts)

  -- Set some keybinds conditional on server capabilities
  if client.resolved_capabilities.document_formatting then
    buf_set_keymap("n", "<space>f", "<cmd>lua vim.lsp.buf.formatting()<CR>", opts)
    -- format on save
    vim.api.nvim_command [[augroup Format]]
    vim.api.nvim_command [[autocmd! * <buffer>]]
    vim.api.nvim_command [[autocmd BufWritePost <buffer> lua vim.lsp.buf.formatting()]]
    vim.api.nvim_command [[augroup END]]
  end
  if client.resolved_capabilities.document_range_formatting then
    buf_set_keymap("v", "<space>f", "<cmd>lua vim.lsp.buf.range_formatting()<CR>", opts)
  end

  -- Set autocommands conditional on server_capabilities
  if client.resolved_capabilities.document_highlight then
    vim.api.nvim_exec([[
      hi LspReferenceRead cterm=bold ctermbg=white guibg=white ctermfg=black guifg=black
      hi LspReferenceText cterm=bold ctermbg=white guibg=white ctermfg=black guifg=black
      hi LspReferenceWrite cterm=bold ctermbg=white guibg=white ctermfg=black guifg=black
      augroup lsp_document_highlight
        autocmd! * <buffer>
        autocmd CursorHold <buffer> lua vim.lsp.buf.document_highlight()
        autocmd CursorMoved <buffer> lua vim.lsp.buf.clear_references()
      augroup END
    ]], false)
  end

end

-- Use a loop to conveniently both setup defined servers 
-- and map buffer local keybindings when the language server attaches
local servers = { "clangd", "sourcekit", "rust_analyzer", "tsserver" }
for _, lsp in ipairs(servers) do
  nvim_lsp[lsp].setup { 
      on_attach = on_attach,
      capabilities = lsp_status.capabilities
  }
end

-- EFM (for linting only)

local eslint = {
  lintCommand = 'eslint_d --stdin --stdin-filename ${INPUT} -f unix',
  lintStdin = true,
  lintIgnoreExitCode = true
}

local efm_config = os.getenv('HOME') .. '/.config/efm-langserver/config.yaml'
local efm_log_dir = '/tmp/'
local efm_root_markers = { 'package.json', '.git/', '.zshrc' }
local efm_languages = {
  javascript = { eslint },
  javascriptreact = { eslint },
  typescript = { eslint },
  typescriptreact = { eslint }
}

nvim_lsp.efm.setup({
  cmd = {
    "efm-langserver",
    "-c",
    efm_config,
    "-logfile",
    efm_log_dir .. "efm.log"
  },
  filetypes = {
    'javascript',
    'javascriptreact',
    'typescript',
    'typescriptreact'
  },
  on_attach = on_attach,
  root_dir = nvim_lsp.util.root_pattern(unpack(efm_root_markers)),
  init_options = {
      -- we only lint with efm
    documentFormatting = false
  },
  settings = {
    rootMarkers = efm_root_markers,
    languages = efm_languages
  }
})

-- Customise diagnostic handler
vim.lsp.handlers["textDocument/publishDiagnostics"] = vim.lsp.with(
vim.lsp.diagnostic.on_publish_diagnostics, {
        -- Enable underline, use default values
        underline = true,
        -- Enable virtual text, override spacing to 4
        virtual_text = {
            spacing = 8,
        },
        -- Disable a feature
        update_in_insert = false,
        -- Make the most serious diagnostic the one that is highlighted
        severity_sort = true,
    }
)
-- Format with 'formatter.nvim'

 require('formatter').setup({
   logging = false,
   filetype = {
     javascript = {
         -- prettier
        function()
           return {
             exe = "prettier",
             args = {"--stdin-filepath", vim.api.nvim_buf_get_name(0)},
             stdin = true
           }
         end
     },
     typescript = {
         -- prettier
        function()
           return {
             exe = "prettier",
             args = {"--stdin-filepath", vim.api.nvim_buf_get_name(0)},
             stdin = true
           }
         end
     },
     rust = {
       -- Rustfmt
       function()
         return {
           exe = "rustfmt",
           args = {"--emit=stdout"},
           stdin = true
         }
       end
     },
     lua = {
         -- luafmt
         function()
           return {
             exe = "luafmt",
             args = {"--indent-count", 2, "--stdin"},
             stdin = true
           }
         end
       }
   }
 })  

 -- Format on save
 vim.api.nvim_exec([[
   augroup FormatAutogroup
   autocmd!
   autocmd BufWritePost *.js,*.rs,*.lua,*.ts FormatWrite
   augroup END
 ]], true)
