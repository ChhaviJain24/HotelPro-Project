import { Link } from 'react-router-dom';
import { inr, Stars, roomImage } from '../utils';

export default function RoomCard({ room, qs = '' }) {
  return (
    <div className="card h-100">
      <div className="room-pic rounded-top" role="img" aria-label={`${room.category} room ${room.number}`}
        style={{ backgroundImage: `linear-gradient(transparent 55%, rgba(0,0,0,.6)), url(${roomImage(room)})` }}>Room {room.number}</div>
      <div className="card-body d-flex flex-column gap-1">
        <div className="d-flex justify-content-between"><h5 className="mb-0">{room.category}</h5>
          {room.available !== undefined && <span className={'badge text-bg-' + (room.available ? 'success' : 'danger')}>{room.available ? 'Available' : 'Booked'}</span>}</div>
        <Stars value={room.avgRating} n={room.numReviews} />
        <div className="small text-body-secondary">Sleeps {room.capacity} · {room.amenities?.slice(0, 4).join(', ')}</div>
        <div className="fs-5 fw-bold mt-1">{inr(room.price)} <span className="fs-6 fw-normal text-body-secondary">/ night</span></div>
        <Link to={`/rooms/${room._id}${qs}`} className="btn btn-primary mt-auto">View and book</Link>
      </div>
    </div>
  );
}
