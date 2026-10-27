export default function Modal({ title, onClose, children, wide }) {
  return (<>
    <div className="modal d-block" role="dialog" aria-modal="true" aria-label={title}>
      <div className={'modal-dialog modal-dialog-scrollable' + (wide ? ' modal-lg' : '')}>
        <div className="modal-content">
          <div className="modal-header"><h5 className="modal-title">{title}</h5><button className="btn-close no-print" aria-label="Close" onClick={onClose} /></div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </div>
    <div className="modal-backdrop show" />
  </>);
}
