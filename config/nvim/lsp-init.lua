-- Abstract:
-- Setup of the native Neovim LSP
-- Called from `init.vim`

require('gitsigns').setup {
  current_line_blame = true, -- Toggle with `:Gitsigns toggle_current_line_blame`
  current_line_blame_opts = {
    virt_text = true,
    virt_text_pos = 'eol', -- 'eol' | 'overlay' | 'right_align'
    delay = 1500,
  },
}

vim.g['formatting_enabled'] = 1
vim.api.nvim_exec([[
command FormatToggle call ToggleFormattingImpl()
function! ToggleFormattingImpl()
    if g:formatting_enabled
        let g:formatting_enabled = 0
        echo "Format-on-write has been disabled"
    else
        let g:formatting_enabled = 1
        echo "Format-on-write has been enabled"
    endif
endfunction
]], false)

-- LSP setup
-- Customise diagnostic handler
vim.lsp.handlers["textDocument/publishDiagnostics"] = vim.lsp.with(
vim.lsp.diagnostic.on_publish_diagnostics, {
        -- Enable underline, use default values
        underline = false,
        -- Enable virtual text for diagnostics
        virtual_text = {
            spacing = 8
        },
        signs = true,
        -- Don't update diagnostics during insert mode, it makes things very noisy
        update_in_insert = false,
        -- Make the most serious diagnostic the one that is highlighted
        severity_sort = true,
    }
)
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

local lsp_status = require('lsp-status') -- for status support
lsp_status.config({
    kind_labels = {},
    current_function = false,
    diagnostics = true,
    indicator_separator = '',
    component_separator = '  ',
    indicator_errors = ' ',
    indicator_warnings = " ",
    indicator_info = " ",
    indicator_hint = " ",
    indicator_ok = '  Ok',
    spinner_frames = {'⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'},
    status_symbol = '',
    select_symbol = nil,
    update_interval = 500
})
lsp_status.register_progress()

local on_attach = function(client, bufnr)
  local function buf_set_keymap(...) vim.api.nvim_buf_set_keymap(bufnr, ...) end
  local function buf_set_option(...) vim.api.nvim_buf_set_option(bufnr, ...) end

  buf_set_option('omnifunc', 'v:lua.vim.lsp.omnifunc')

  -- Nvim Compe does not have native signature completion
  -- we use 'ray-x/lsp_signature.nvim' to get this behaviour
  -- https://github.com/ray-x/lsp_signature.nvim#full-configuration
  require "lsp_signature".on_attach({
      bind = true, -- This is mandatory, otherwise border config won't get registered.
      hint_enable = false,
      floating_window = true,
      handler_opts = {
          border = "single"
      },
      decorator = {"**", "**"}
  })

  -- LSP status bar
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
  buf_set_keymap('n', '<C-s>', '<cmd>lua vim.lsp.buf.code_action()<CR>', opts)
  buf_set_keymap('n', 'gr', '<cmd>lua vim.lsp.buf.references()<CR>', opts)
  buf_set_keymap('n', '<space>e', '<cmd>lua vim.lsp.diagnostic.show_line_diagnostics()<CR>', opts)
  buf_set_keymap('n', '[d', '<cmd>lua vim.lsp.diagnostic.goto_prev()<CR>', opts)
  buf_set_keymap('n', ']d', '<cmd>lua vim.lsp.diagnostic.goto_next()<CR>', opts)
  buf_set_keymap('n', '<space>q', '<cmd>lua vim.lsp.diagnostic.set_loclist()<CR>', opts)
  buf_set_keymap('n', '<space>f', ':Format<CR>', opts)

  -- Highlight matching references to word using the LSP
  if client.resolved_capabilities.document_highlight then
    vim.api.nvim_exec([[
      augroup lsp_document_highlight
        autocmd! * <buffer>
        autocmd CursorHold <buffer> lua vim.lsp.buf.document_highlight()
        autocmd CursorMoved <buffer> lua vim.lsp.buf.clear_references()
      augroup END
    ]], false)
  end

  -- Format known formatable langs only
  vim.api.nvim_exec([[
  augroup FormatAutogroup
  autocmd!
  autocmd BufWritePost *.js,*.ts,*.rs,*.c,*.cpp,*.py,*.json,*.yaml,*.yml call FormatWriteMaybe()
  function! FormatWriteMaybe()
    if g:formatting_enabled
      FormatWrite
    endif
  endfunction
  augroup END
  ]], true)

end

-- LANG SERVER CONFIGS
local lspconfig = require('lspconfig')
-- update capabilities with lsp_status
lspconfig.capabilities = vim.tbl_extend('keep', lspconfig.capabilities or {}, lsp_status.capabilities)
-- update capaabilities with nvim cmp completions
local capabilities = require('cmp_nvim_lsp').update_capabilities(vim.lsp.protocol.make_client_capabilities())

lspconfig.clangd.setup { 
    handlers = lsp_status.extensions.clangd.setup(),
    capabilities = capabilities,
    on_attach = on_attach
}

lspconfig.pyright.setup {
    capabilities = capabilities,
    on_attach = on_attach
}

lspconfig.sourcekit.setup { 
    capabilities = capabilities,
    on_attach = on_attach
}

lspconfig.rust_analyzer.setup { 
    capabilities = capabilities,
    on_attach = on_attach
}

lspconfig.tsserver.setup {
    capabilities = capabilities,
    on_attach = function(client, buf)
        -- we use prettier to format, not tsserver
        client.resolved_capabilities.document_formatting = false
        client.resolved_capabilities.document_range_formatting = false
        on_attach(client, buf)
    end
}

-- null-ls is used to get DIAGNOSTICS ONLY (don't use it for formatting)

local null_ls = require("null-ls")

local sources = {
  -- (not used for formatting, as we keep hitting bugs)
  -- null_ls.builtins.formatting.prettier,
  null_ls.builtins.diagnostics.write_good,
  null_ls.builtins.diagnostics.eslint,
  null_ls.builtins.diagnostics.flake8,
  null_ls.builtins.code_actions.gitsigns,
}

null_ls.config({
  diagnostics_format = "#{m}",
  debounce = 250,
  default_timeout = 5000,
  sources = sources
})

lspconfig["null-ls"].setup({
    -- see the nvim-lspconfig documentation for available configuration options
    capabilities = capabilities,
    on_attach = on_attach
})

-- FORMATTER is used to get FORMATTING (because I'm hitting prettier bugs using null-ls for formatting as well)

local formatter = require('formatter')

local prettier = function() 
  return {
    exe = "prettier",
    args = {"--stdin-filepath", vim.fn.fnameescape(vim.api.nvim_buf_get_name(0))},
    stdin = true
  }
end

local clang_format = function()
  return {
    exe = "clang-format",
    args = {"--assume-filename", vim.api.nvim_buf_get_name(0)},
    stdin = true,
    cwd = vim.fn.expand('%:p:h')  -- Run clang-format in cwd of the file.
  }
end

local rustfmt = function()
  return {
    exe = "rustfmt",
    args = {"--emit=stdout"},
    stdin = true
  }
end

local fixjson = function()
  return {
    exe = "fixjson",
    args = {},
    stdin = true
  }
end

local black = function()
  return {
    exe = "black",
    args = { "--quiet", "--fast", "-" },
    stdin = true
  }
end

formatter.setup({
  filetype = {
    javascript = {
      prettier
    },
    typescript = {
      prettier
    },
    yaml = {
      prettier
    },
    json = {
      prettier
    },
    cpp = {
      clang_format
    },
    c = {
      clang_format
    },
    rust = {
      rustfmt
    },
    python = {
      black
    }
  }
})
