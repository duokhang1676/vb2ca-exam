alter table public.nlxh_section_packs
  add column if not exists title text not null default '',
  add column if not exists serial_number integer not null default 0;

with numbered as (
  select
    id,
    row_number() over (order by created_at asc, id asc) as n
  from public.nlxh_section_packs
  where serial_number = 0 or title = ''
)
update public.nlxh_section_packs as packs
set
  serial_number = numbered.n,
  title = case
    when packs.title = '' then 'Đề NLXH số ' || numbered.n::text
    else packs.title
  end
from numbered
where packs.id = numbered.id;

create unique index if not exists nlxh_section_packs_serial_unique
  on public.nlxh_section_packs (serial_number);
